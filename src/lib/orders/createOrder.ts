import { randomBytes } from "crypto";
import { z } from "zod";
import { CustomerDetailsSchema } from "../schemas";
import { connectToDatabase } from "../db/mongoose";
import { Order } from "../models/Order";
import { calculateCart } from "../pricing/calculateCart";
import { PricingErrorCode } from "../pricing/types";
import { reserveCoupon } from "../pricing/validateCoupon";
import { applyStoreCredit, restoreStoreCredit } from "../pricing/credits";

const OrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customer: CustomerDetailsSchema,
  items: z.array(OrderItemSchema).min(1),
  // One coupon per order (MVP) — applied from Phase 2 onwards.
  couponCode: z.string().trim().max(32).optional(),
  // Client-generated idempotency key: retries with the same key replay the
  // existing order instead of creating a duplicate.
  idempotencyKey: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid idempotency key")
    .optional(),
  useCredits: z.boolean().optional().default(false),
});

export type CreateOrderPayload = z.infer<typeof CreateOrderSchema>;

/** Raised when the pricing engine rejects the cart (product/coupon/stock). */
export class PricingRejectionError extends Error {
  public readonly code: PricingErrorCode;
  constructor(code: PricingErrorCode, message: string) {
    super(message);
    this.name = "PricingRejectionError";
    this.code = code;
  }
}

function newOrderId(): string {
  const hex = Buffer.from(randomBytes(4)).toString("hex");
  // Previously `ord_${Date.now()}` — added a random suffix so concurrent
  // orders in the same millisecond cannot collide on the unique index.
  return `ord_${Date.now()}_${hex}`;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" && err !== null && (err as { code?: number }).code === 11000
  );
}

/**
 * Server-only: persists an order to MongoDB.
 * This file must NOT be imported from any client component.
 *
 * Pricing authority: totals are recomputed from MongoDB inside
 * `calculateCart` — the client supplies only IDs, quantities, and hints.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  userId?: string
): Promise<{ order: Record<string, unknown>; replayed: boolean }> {
  const parsed = CreateOrderSchema.parse(payload);

  await connectToDatabase();

  // Idempotent replay: an earlier attempt with the same key already succeeded.
  if (parsed.idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey: parsed.idempotencyKey });
    if (existing) {
      return { order: existing.toJSON(), replayed: true };
    }
  }

  // "New customer" context for delivery-fee user rules and (later) first-order
  // coupon/referral eligibility: prior orders exclude cancelled/failed.
  const orderCount = userId
    ? await Order.countDocuments({
        userId,
        status: { $nin: ["cancelled"] },
        paymentStatus: { $nin: ["failed"] },
      })
    : 0;

  const pricing = await calculateCart({
    items: parsed.items,
    userId,
    orderCount,
    deliverySlot: parsed.customer.deliverySlot,
    couponCode: parsed.couponCode,
    useCredits: parsed.useCredits,
  });
  if (!pricing.ok) {
    throw new PricingRejectionError(pricing.error.code, pricing.error.message);
  }

  const items = pricing.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    name: line.name,
    unit: line.unit,
    image: line.image,
  }));

  const orderId = newOrderId();
  let couponRedemption: { _id?: unknown } | null = null;
  let creditEntry: { entryId?: string } | null = null;
  if (pricing.coupon && userId) {
    couponRedemption = await reserveCoupon(
      pricing.coupon.id,
      pricing.coupon.code,
      userId,
      orderId,
      pricing.coupon.discount
    );
  }
  if (parsed.useCredits && userId && pricing.breakdown.storeCreditApplied > 0) {
    creditEntry = await applyStoreCredit(userId, pricing.breakdown.storeCreditApplied, orderId) as unknown as { entryId?: string };
  }
  const orderDoc = {
    orderId,
    status: "pending",
    totalAmount: pricing.breakdown.grandTotal,
    pricing: pricing.breakdown,
    appliedPromotions: pricing.appliedPromotions,
    couponRedemptionIds: couponRedemption ? [String(couponRedemption._id)] : [],
    creditLedgerEntryIds: [],
    ...(creditEntry ? { creditLedgerEntryIds: [String(creditEntry.entryId || "")] } : {}),
    idempotencyKey: parsed.idempotencyKey || undefined,
    estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    customer: parsed.customer,
    items,
    userId: userId || null,
    createdAt: new Date().toISOString(),
  };

  try {
    const order = await Order.create(orderDoc);
    return { order: order.toJSON(), replayed: false };
  } catch (err: unknown) {
    if (couponRedemption) {
      const { releaseCouponRedemption } = await import("../pricing/validateCoupon");
      await releaseCouponRedemption(orderId);
    }
    if (creditEntry && userId) await restoreStoreCredit(userId, pricing.breakdown.storeCreditApplied, orderId);
    // Concurrent duplicate on the idempotency key → replay the winner instead
    // of surfacing an internal error.
    if (parsed.idempotencyKey && isDuplicateKeyError(err)) {
      const existing = await Order.findOne({ idempotencyKey: parsed.idempotencyKey });
      if (existing) {
        return { order: existing.toJSON(), replayed: true };
      }
    }
    throw err;
  }
}