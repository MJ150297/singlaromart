import { describe, expect, it } from "vitest";
import {
  DeliveryCartContext,
  DeliveryRuleInput,
  resolveDeliveryFee,
} from "./deliveryFees";

const BASE_CTX: DeliveryCartContext = {
  lines: [
    { productId: "ind-001", categoryId: "cat-dairy", subcategoryId: "sub-milk" },
    { productId: "ind-002", categoryId: "cat-veg", subcategoryId: "sub-tomato" },
  ],
  cartTotal: 500,
  deliverySlot: "Evening (4 PM - 8 PM)",
  isFirstOrderOfUser: true,
  orderCount: 0,
};

function rule(overrides: Partial<DeliveryRuleInput>): DeliveryRuleInput {
  return {
    id: `rule-${Math.random().toString(36).slice(2, 8)}`,
    appliesTo: { allProducts: true },
    feeType: "flat",
    amount: 25,
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

const DEFAULT_RULE = rule({ id: "global", appliesTo: { allProducts: true }, amount: 25 });

describe("resolveDeliveryFee", () => {
  it("returns ₹0 with no matching rules (preserves legacy behavior)", () => {
    expect(resolveDeliveryFee([], BASE_CTX)).toEqual({ amount: 0, source: "default" });
  });

  it("applies a global default rule", () => {
    expect(resolveDeliveryFee([DEFAULT_RULE], BASE_CTX)).toEqual({
      amount: 25,
      ruleId: "global",
      source: "rule",
    });
  });

  it("product rule beats category and global rules", () => {
    const product = rule({
      id: "product-rule",
      appliesTo: { productIds: ["ind-001"] },
      amount: 10,
      priority: 5,
    });
    const category = rule({
      id: "category-rule",
      appliesTo: { categoryIds: ["cat-veg"] },
      amount: 15,
      priority: 99,
    });
    expect(resolveDeliveryFee([DEFAULT_RULE, product, category], BASE_CTX)).toEqual({
      amount: 10,
      ruleId: "product-rule",
      source: "rule",
    });
  });

  it("subcategory beats category, which beats global", () => {
    const subcat = rule({
      id: "subcat-rule",
      appliesTo: { subcategoryIds: ["sub-milk"] },
      amount: 12,
    });
    const category = rule({
      id: "category-rule",
      appliesTo: { categoryIds: ["cat-dairy"] },
      amount: 15,
    });
    expect(resolveDeliveryFee([DEFAULT_RULE, category], BASE_CTX)).toEqual({
      amount: 15,
      ruleId: "category-rule",
      source: "rule",
    });
    expect(resolveDeliveryFee([DEFAULT_RULE, category, subcat], BASE_CTX)).toEqual({
      amount: 12,
      ruleId: "subcat-rule",
      source: "rule",
    });
  });

  it("slot-specific rule beats slot-agnostic at equal breadth", () => {
    const slotRule = rule({
      id: "slot-rule",
      deliverySlots: ["Evening (4 PM - 8 PM)"],
      amount: 5,
      priority: 0,
    });
    const agnostic = rule({ id: "agnostic-rule", amount: 10, priority: 100 });
    expect(resolveDeliveryFee([agnostic, slotRule], BASE_CTX)).toEqual({
      amount: 5,
      ruleId: "slot-rule",
      source: "rule",
    });
    expect(
      resolveDeliveryFee(
        [agnostic, slotRule],
        { ...BASE_CTX, deliverySlot: "Morning (8 AM - 12 PM)" }
      )
    ).toEqual({ amount: 10, ruleId: "agnostic-rule", source: "rule" });
  });
it("skips inactive, future, and expired rules", () => {
    const inactive = rule({ id: "inactive", amount: 1, isActive: false });
    const future = rule({
      id: "future",
      amount: 1,
      startsAt: new Date(Date.now() + 86_400_000),
    });
    const expired = rule({
      id: "expired",
      amount: 1,
      endsAt: new Date(Date.now() - 86_400_000),
    });
    const now = new Date();
    expect(
      resolveDeliveryFee([inactive, future, expired, DEFAULT_RULE], BASE_CTX, { now })
    ).toEqual({ amount: 25, ruleId: "global", source: "rule" });
  });

  it("higher priority wins within the same breadth", () => {
    const low = rule({ id: "low", amount: 3, priority: 1 });
    const high = rule({ id: "high", amount: 7, priority: 2 });
    expect(resolveDeliveryFee([low, high], BASE_CTX)).toEqual({
      amount: 7,
      ruleId: "high",
      source: "rule",
    });
  });

  it("free_over_threshold matches when met and falls through when not", () => {
    const threshold = rule({
      id: "threshold",
      feeType: "free_over_threshold",
      minOrderAmount: 500,
    });
    expect(
      resolveDeliveryFee([threshold, DEFAULT_RULE], { ...BASE_CTX, cartTotal: 600 })
    ).toEqual({ amount: 0, ruleId: "threshold", source: "rule" });
    expect(
      resolveDeliveryFee([threshold, DEFAULT_RULE], { ...BASE_CTX, cartTotal: 300 })
    ).toEqual({ amount: 25, ruleId: "global", source: "rule" });
  });

  it("filters by user type (new vs existing) and minimum orders", () => {
    const newUserFree = rule({
      id: "new-free",
      userEligibility: { userType: "new" },
      amount: 0,
    });
    const existingOnly = rule({
      id: "existing-only",
      userEligibility: { userType: "existing", minimumOrders: 3 },
      amount: 8,
    });
    expect(resolveDeliveryFee([newUserFree, existingOnly], BASE_CTX)).toEqual({
      amount: 0,
      ruleId: "new-free",
      source: "rule",
    });
    const existing = { ...BASE_CTX, isFirstOrderOfUser: false, orderCount: 2 };
    expect(resolveDeliveryFee([newUserFree, existingOnly], existing)).toEqual({
      amount: 0,
      source: "default",
    });
    const loyal = { ...existing, orderCount: 4 };
    expect(resolveDeliveryFee([newUserFree, existingOnly], loyal)).toEqual({
      amount: 8,
      ruleId: "existing-only",
      source: "rule",
    });
  });

  it("free-delivery coupon overrides everything", () => {
    const expensive = rule({ appliesTo: { allProducts: true }, amount: 50, priority: 0 });
    expect(
      resolveDeliveryFee([expensive], BASE_CTX, { freeDeliveryCouponApplied: true })
    ).toEqual({ amount: 0, source: "coupon_override" });
  });
});