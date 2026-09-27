import { z } from "zod";

/**
 * Pricing domain types shared between the server pricing engine and the
 * client checkout preview. This file must stay client-safe: NO imports from
 * `mongoose`, models, or `next/server`.
 */

export const CURRENCY = "INR" as const;

/**
 * Stable error codes returned by the pricing engine. The UI renders friendly
 * messages from these codes.
 */
export const PRICING_ERROR_CODES = [
  "INVALID_REQUEST",
  "PRODUCT_UNAVAILABLE",
  "OUT_OF_STOCK",
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "COUPON_NOT_STARTED",
  "COUPON_EXHAUSTED",
  "COUPON_USER_LIMIT",
  "COUPON_MIN_ORDER",
  "COUPON_SCOPE_EXCLUDED",
  "COUPON_FIRST_ORDER_ONLY",
  "REFERRAL_REWARD_UNAVAILABLE",
  "IDEMPOTENCY_DUPLICATE",
  "UNAUTHORIZED",
  "INTERNAL",
] as const;

export type PricingErrorCode = (typeof PRICING_ERROR_CODES)[number];

export interface PricingError {
  code: PricingErrorCode;
  message: string;
  field?: string;
}

/** An item as submitted by the client (IDs only — never prices). */
export const CartItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  // Upper quantity bound mirrors the server-side guard.
  quantity: z.number().int().positive().max(100),
});
export type CartItemInput = z.infer<typeof CartItemInputSchema>;

/**
 * A canonical, server-priced cart line.
 */
export const PricingLineSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string().optional(),
  unit: z.string().optional(),
  image: z.unknown().optional(),
  quantity: z.number().int().positive().max(100),
  unitPrice: z.number().min(0),
  lineTotal: z.number().min(0),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
});
export type PricingLine = z.infer<typeof PricingLineSchema>;

export const AppliedPromotionSchema = z.object({
  type: z.enum(["coupon", "referral_benefit", "store_credit"]),
  code: z.string().optional(),
  promotionId: z.string().optional(),
  amount: z.number().min(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type AppliedPromotion = z.infer<typeof AppliedPromotionSchema>;

export const PricingBreakdownSchema = z.object({
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  couponDiscount: z.number().min(0),
  referralDiscount: z.number().min(0),
  discountTotal: z.number().min(0),
  storeCreditApplied: z.number().min(0),
  totalBeforeCredits: z.number().min(0),
  grandTotal: z.number().min(0),
  currency: z.literal(CURRENCY),
  taxInclusive: z.literal(true),
});
export type PricingBreakdown = z.infer<typeof PricingBreakdownSchema>;

export interface PricingCartResult {
  ok: true;
  lines: PricingLine[];
  breakdown: PricingBreakdown;
  appliedPromotions: AppliedPromotion[];
  /** Resolved coupon (id + code) when one was applied. */
  coupon?: { id: string; code: string; discount: number };
  /** Store credits the user could apply (used for preview UI). */
  storeCreditAvailable?: number;
}

export interface PricingCartFailure {
  ok: false;
  error: PricingError;
  /** Set when the failure came from coupon validation. */
  couponCode?: string;
}

export type PricingCartOutput = PricingCartResult | PricingCartFailure;