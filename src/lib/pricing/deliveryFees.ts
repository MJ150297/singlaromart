/**
 * Pure delivery-fee resolver — takes admin-managed `DeliveryFeeRule`s and a
 * cart/user context and returns the single applicable fee.
 *
 * Pure (no DB) so precedence logic is unit-testable with plain fixtures.
 *
 * Precedence (locked in docs/PROMOTIONS.md):
 *   1. `free_delivery` coupon override (highest)
 *   2. scope breadth: product → subcategory → category → global
 *   3. within a breadth: slot-specific beats slot-agnostic
 *   4. then higher `priority`
 *   5. `free_over_threshold` falls through when the cart is under `minOrderAmount`
 *   6. no match → ₹0
 */

export interface DeliveryRuleScope {
  productIds?: readonly string[];
  subcategoryIds?: readonly string[];
  categoryIds?: readonly string[];
  allProducts?: boolean;
}

export interface DeliveryRuleInput {
  id: string;
  name?: string;
  appliesTo: DeliveryRuleScope;
  userEligibility?: {
    userType?: "all" | "new" | "existing";
    minimumOrders?: number;
  };
  deliverySlots?: readonly string[];
  feeType: "flat" | "free_over_threshold";
  amount: number;
  minOrderAmount?: number;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
}

export interface DeliveryCartContext {
  /** Server-priced lines (productId + category linkage). */
  lines: ReadonlyArray<{
    productId: string;
    categoryId?: string;
    subcategoryId?: string;
  }>;
  /** Eligible subtotal — the basis for `free_over_threshold` checks. */
  cartTotal: number;
  deliverySlot?: string;
  /** "new user" = no prior order outside the cancelled/failed set. */
  isFirstOrderOfUser?: boolean;
  /** Total prior orders (for userEligibility.minimumOrders). */
  orderCount?: number;
}

export interface DeliveryFeeDecision {
  /** The resolved fee amount (already rounded server-side upstream). */
  amount: number;
  /** The winning rule's id, when a rule matched. */
  ruleId?: string;
  source: "rule" | "coupon_override" | "default";
}

const BREADTH_PRODUCT = 0;
const BREADTH_SUBCATEGORY = 1;
const BREADTH_CATEGORY = 2;
const BREADTH_GLOBAL = 3;

function toArray(value: readonly string[] | undefined | null): readonly string[] {
  return value ?? [];
}

function inSchedule(rule: DeliveryRuleInput, now: Date): boolean {
  const start = rule.startsAt ? new Date(rule.startsAt) : null;
  const end = rule.endsAt ? new Date(rule.endsAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function isUserEligible(rule: DeliveryRuleInput, ctx: DeliveryCartContext): boolean {
  const eligibility = rule.userEligibility ?? {};
  const userType = eligibility.userType ?? "all";
  const isFirstOrder = ctx.isFirstOrderOfUser === true;

  if (userType === "new" && !isFirstOrder) return false;
  if (userType === "existing" && isFirstOrder) return false;

  const minimumOrders = eligibility.minimumOrders;
  if (typeof minimumOrders === "number") {
    const count = typeof ctx.orderCount === "number" ? ctx.orderCount : 0;
    if (count < minimumOrders) return false;
  }
  return true;
}

/**
 * @returns scope breadth if the rule's product/category scope intersects the
 *          cart, null otherwise. Rules with no explicit scope do NOT match.
 */
function scopeBreadth(rule: DeliveryRuleInput, ctx: DeliveryCartContext): number | null {
  const sm = rule.appliesTo;
  const productsMatch =
    toArray(sm.productIds).length > 0 &&
    ctx.lines.some((l) => toArray(sm.productIds).includes(l.productId));
  if (productsMatch) return BREADTH_PRODUCT;

  const subcatsMatch =
    toArray(sm.subcategoryIds).length > 0 &&
    ctx.lines.some((l) => toArray(sm.subcategoryIds).includes(l.subcategoryId ?? ""));
  if (subcatsMatch) return BREADTH_SUBCATEGORY;

  const catsMatch =
    toArray(sm.categoryIds).length > 0 &&
    ctx.lines.some((l) => toArray(sm.categoryIds).includes(l.categoryId ?? ""));
  if (catsMatch) return BREADTH_CATEGORY;

  if (sm.allProducts === true) return BREADTH_GLOBAL;

  return null;
}

/**
 * Resolves the applicable delivery fee for a cart.
 * `options.freeDeliveryCouponApplied` overrides everything (free-delivery coupon).
 */
export function resolveDeliveryFee(
  rules: readonly DeliveryRuleInput[],
  ctx: DeliveryCartContext,
  options?: { freeDeliveryCouponApplied?: boolean; now?: Date }
): DeliveryFeeDecision {
  if (options?.freeDeliveryCouponApplied === true) {
    return { amount: 0, source: "coupon_override" };
  }

  const now = options?.now ?? new Date();

  let best: { rule: DeliveryRuleInput; breadth: number; slotSpecific: boolean } | null = null;

  for (const rule of rules) {
    if (rule.isActive !== undefined && rule.isActive === false) continue;
    if (!inSchedule(rule, now)) continue;
    if (!isUserEligible(rule, ctx)) continue;
    if (rule.feeType === "free_over_threshold") {
      const minOrder = rule.minOrderAmount ?? 0;
      if (ctx.cartTotal < minOrder) continue; // falls through to the next rule
    }

    const breadth = scopeBreadth(rule, ctx);
    if (breadth === null) continue;

    // Slot-specific rules only match the configured slot; slot-agnostic rules match any.
    const slots = toArray(rule.deliverySlots);
    const slotSpecific = slots.length > 0;
    if (slotSpecific) {
      if (!ctx.deliverySlot || !slots.includes(ctx.deliverySlot)) continue;
    }

    if (!best) {
      best = { rule, breadth, slotSpecific };
      continue;
    }
    const priority = rule.priority ?? 0;
    const bestPriority = best.rule.priority ?? 0;
    const better =
      breadth < best.breadth ||
      (breadth === best.breadth && slotSpecific && !best.slotSpecific) ||
      (breadth === best.breadth && slotSpecific === best.slotSpecific && priority > bestPriority);
    if (better) best = { rule, breadth, slotSpecific };
  }

  if (!best) return { amount: 0, source: "default" };

  const amount = best.rule.feeType === "free_over_threshold" ? 0 : best.rule.amount;
  return { amount, ruleId: best.rule.id, source: "rule" };
}