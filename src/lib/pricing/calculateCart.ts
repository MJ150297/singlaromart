import {
  DeliveryCartContext,
  DeliveryRuleInput,
  resolveDeliveryFee,
} from "./deliveryFees";
import { fetchCartItems } from "./fetchCart";
import { moneySum, roundMoney } from "./money";
import { loadActiveDeliveryFeeRules } from "./rulesStore";
import { resolveCoupon, reserveCoupon } from "./validateCoupon";
import { resolveReferralBenefit } from "./referralRules";
import { User } from "@/lib/models/User";
import {
  AppliedPromotion,
  CartItemInput,
  PricingBreakdown,
  PricingCartOutput,
  PricingLine,
  PricingLineSchema,
} from "./types";

/**
 * Pricing orchestrator. Computes the canonical breakdown for a checkout.
 *
 * `composePricing` is the pure core (unit-testable with fixtures);
 * `calculateCart` fetches products + delivery rules from the DB and delegates.
 */

export interface CalculateCartOptions {
  items: CartItemInput[];
  /** Registered user id (for user-type delivery rules + credits preview). */
  userId?: string;
  /** Number of prior non-cancelled/non-failed orders (for "new user" rules). */
  orderCount?: number;
  deliverySlot?: string;
  /** Coupon application arrives in Phase 2; kept in the contract now. */
  couponCode?: string;
  useCredits?: boolean;
  now?: Date;
  /** Test seam — skip loading rules from the DB. */
  feeRules?: readonly DeliveryRuleInput[];
  /** Test seam — skip fetching products from the DB. */
  fetchedLines?: PricingLine[];
}

export interface ComposePricingOptions {
  feeRules: readonly DeliveryRuleInput[];
  couponCode?: string;
  deliverySlot?: string;
  isFirstOrderOfUser?: boolean;
  orderCount?: number;
  now?: Date;
  coupon?: { id: string; code: string; discount: number };
  referral?: { programId: string; amount: number };
  creditBalance?: number;
  useCredits?: boolean;
}

/** Pure pricing core — no I/O. */
export function composePricing(
  fetched: { lines: readonly PricingLine[]; subtotal: number },
  opts: ComposePricingOptions
): { ok: true; lines: PricingLine[]; breakdown: PricingBreakdown; appliedPromotions: AppliedPromotion[]; storeCreditAvailable: number; coupon?: { id: string; code: string; discount: number } } {
  const lines = fetched.lines.map((l) => PricingLineSchema.parse(l));
  const subtotal = roundMoney(fetched.subtotal);

  const feeContext: DeliveryCartContext = {
    lines,
    cartTotal: subtotal,
    deliverySlot: opts.deliverySlot,
    isFirstOrderOfUser: opts.isFirstOrderOfUser,
    orderCount: opts.orderCount,
  };
  const fee = resolveDeliveryFee(opts.feeRules, feeContext, { now: opts.now });
  const deliveryFee = roundMoney(fee.amount);

  const couponDiscount = roundMoney(opts.coupon?.discount ?? 0);
  const referralDiscount = roundMoney(opts.referral?.amount ?? 0);
  const discountTotal = moneySum([couponDiscount, referralDiscount]);
  const totalBeforeCredits = roundMoney(
    Math.max(0, subtotal + deliveryFee - discountTotal)
  );
  const storeCreditApplied = opts.useCredits ? roundMoney(Math.min(opts.creditBalance ?? 0, totalBeforeCredits)) : 0;
  const grandTotal = roundMoney(totalBeforeCredits - storeCreditApplied);

  const breakdown: PricingBreakdown = {
    subtotal,
    deliveryFee,
    couponDiscount,
    referralDiscount,
    discountTotal,
    storeCreditApplied,
    totalBeforeCredits,
    grandTotal,
    currency: "INR",
    taxInclusive: true,
  };

  return {
    ok: true,
    lines: lines.map((l) => ({ ...l })),
    breakdown,
    appliedPromotions: [
      ...(couponDiscount > 0 && opts.coupon ? [{ type: "coupon" as const, code: opts.coupon.code, promotionId: opts.coupon.id, amount: couponDiscount }] : []),
      ...(referralDiscount > 0 && opts.referral ? [{ type: "referral_benefit" as const, promotionId: opts.referral.programId, amount: referralDiscount }] : []),
    ],
    storeCreditAvailable: 0,
  };
}

/**
 * Fetches products and delivery rules, then composes the final pricing.
 * @throws PricingRejectionError only for hard request errors; availability
 * failures are returned as `{ ok: false }` results.
 */
export async function calculateCart(
  options: CalculateCartOptions
): Promise<PricingCartOutput> {
  const now = options.now ?? new Date();

  let lines: PricingLine[] | undefined = options.fetchedLines;
  let subtotal: number;
  if (options.fetchedLines) {
    subtotal = moneySum(options.fetchedLines.map((l) => l.lineTotal));
  } else {
    const fetched = await fetchCartItems(options.items);
    if (fetched.errors.length > 0) {
      const first = fetched.errors[0];
      return { ok: false, error: first };
    }
    lines = fetched.lines;
    subtotal = fetched.subtotal;
  }

  const feeRules = options.feeRules ?? (await loadActiveDeliveryFeeRules());
  const couponResult = await resolveCoupon(options.couponCode, {
    userId: options.userId,
    orderCount: options.orderCount ?? 0,
    subtotal,
    lines: lines ?? [],
    now,
  });
  if (couponResult.error) return { ok: false, error: couponResult.error, couponCode: options.couponCode };
  const referral = await resolveReferralBenefit(options.userId, options.orderCount ?? 0, lines ?? [], subtotal, now);

  const result = composePricing(
    { lines: lines ?? [], subtotal },
    {
      feeRules,
      couponCode: options.couponCode,
      deliverySlot: options.deliverySlot,
      isFirstOrderOfUser: options.orderCount === 0,
      orderCount: options.orderCount,
      now,
      coupon: couponResult.coupon.id ? couponResult.coupon : undefined,
      referral: referral ?? undefined,
      creditBalance: options.userId ? ((await User.findById(options.userId).select("creditBalance").lean())?.creditBalance ?? 0) : 0,
      useCredits: options.useCredits,
    }
  );
  if (couponResult.coupon.id) result.coupon = couponResult.coupon;
  return result;
}