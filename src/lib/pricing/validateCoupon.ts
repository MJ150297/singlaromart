import { Coupon } from "@/lib/models/Coupon";
import { CouponRedemption } from "@/lib/models/CouponRedemption";
import { moneyClamp, roundMoney } from "./money";
import type { PricingError, PricingLine } from "./types";

export interface CouponContext {
  userId?: string;
  orderCount: number;
  subtotal: number;
  lines: readonly PricingLine[];
  now: Date;
}

export interface CouponDecision {
  coupon: { id: string; code: string; discount: number };
  error?: never;
}

export interface CouponFailure {
  coupon?: never;
  error: PricingError;
}

function failure(code: PricingError["code"], message: string): CouponFailure {
  return { error: { code, message, field: "couponCode" } };
}

export async function resolveCoupon(code: string | undefined, context: CouponContext): Promise<CouponDecision | CouponFailure> {
  if (!code?.trim()) return { coupon: { id: "", code: "", discount: 0 } };
  const normalized = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalized }).lean();
  if (!coupon || !coupon.isActive) return failure("COUPON_INVALID", "This coupon is not valid.");

  const now = context.now;
  if (coupon.startsAt && now < new Date(coupon.startsAt)) return failure("COUPON_NOT_STARTED", "This coupon is not active yet.");
  if (coupon.endsAt && now > new Date(coupon.endsAt)) return failure("COUPON_EXPIRED", "This coupon has expired.");
  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) return failure("COUPON_EXHAUSTED", "This coupon has reached its usage limit.");
  if (coupon.eligibleUserType === "new" && context.orderCount > 0) return failure("COUPON_FIRST_ORDER_ONLY", "This coupon is for new customers only.");
  if (coupon.eligibleUserType === "existing" && context.orderCount === 0) return failure("COUPON_USER_LIMIT", "This coupon is for existing customers only.");
  if (coupon.firstOrderOnly && context.orderCount > 0) return failure("COUPON_FIRST_ORDER_ONLY", "This coupon is valid only on your first order.");
  if (context.subtotal < (coupon.minimumOrderAmount ?? 0)) return failure("COUPON_MIN_ORDER", `Add ₹${coupon.minimumOrderAmount} more to use this coupon.`);

  const excluded = new Set(coupon.excludedProductIds ?? []);
  if (context.lines.some((line) => excluded.has(line.productId))) return failure("COUPON_SCOPE_EXCLUDED", "This coupon excludes an item in your cart.");
  const eligibleProducts = new Set(coupon.eligibleProductIds ?? []);
  const eligibleCategories = new Set(coupon.eligibleCategoryIds ?? []);
  const eligibleSubcategories = new Set(coupon.eligibleSubcategoryIds ?? []);
  const hasScope = eligibleProducts.size || eligibleCategories.size || eligibleSubcategories.size;
  const eligibleLines = hasScope
    ? context.lines.filter((line) => eligibleProducts.has(line.productId) || eligibleCategories.has(line.categoryId || "") || eligibleSubcategories.has(line.subcategoryId || ""))
    : context.lines;
  if (hasScope && eligibleLines.length === 0) return failure("COUPON_SCOPE_EXCLUDED", "This coupon does not apply to the items in your cart.");
  if (context.userId) {
    const userRedemptions = await CouponRedemption.countDocuments({ couponId: coupon.id, userId: context.userId, status: { $in: ["reserved", "redeemed"] } });
    if (userRedemptions >= (coupon.perUserLimit ?? 1)) return failure("COUPON_USER_LIMIT", "You have already used this coupon.");
  }

  const eligibleSubtotal = roundMoney(eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const rawDiscount = coupon.discountType === "percentage"
    ? eligibleSubtotal * (coupon.discountValue / 100)
    : coupon.discountValue;
  const discount = moneyClamp(rawDiscount, 0, Math.min(eligibleSubtotal, coupon.maximumDiscountAmount ?? eligibleSubtotal));
  return { coupon: { id: String(coupon.id), code: normalized, discount } };
}

export async function reserveCoupon(couponId: string, code: string, userId: string, orderId: string, discountAmount: number) {
  const filter: Record<string, unknown> = { id: couponId, isActive: true };
  const coupon = await Coupon.findOneAndUpdate(
    couponId ? { ...filter, $or: [{ usageLimit: { $exists: false } }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }] } : filter,
    { $inc: { usageCount: 1 } },
    { returnDocument: "after" }
  );
  if (!coupon) throw new Error("Coupon is no longer available.");
  try {
    return await CouponRedemption.create({ couponId, code, userId, orderId, discountAmount, status: "reserved" });
  } catch (error) {
    await Coupon.updateOne({ id: couponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
    throw error;
  }
}

export async function releaseCouponRedemption(orderId: string) {
  const redemption = await CouponRedemption.findOneAndUpdate(
    { orderId, status: "reserved" },
    { $set: { status: "released", releasedAt: new Date() } },
    { returnDocument: "after" }
  );
  if (redemption) await Coupon.updateOne({ id: redemption.couponId, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } });
  return redemption;
}

export async function redeemCouponRedemption(orderId: string) {
  return CouponRedemption.findOneAndUpdate(
    { orderId, status: "reserved" },
    { $set: { status: "redeemed", redeemedAt: new Date() } },
    { returnDocument: "after" }
  );
}
