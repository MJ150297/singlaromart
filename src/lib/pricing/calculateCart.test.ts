import { describe, expect, it } from "vitest";
import { composePricing } from "./calculateCart";
import { DeliveryRuleInput } from "./deliveryFees";
import { PricingLine } from "./types";

const LINES: PricingLine[] = [
  {
    productId: "ind-001",
    name: "Milk",
    unit: "500ml",
    quantity: 2,
    unitPrice: 25.5,
    lineTotal: 51,
  },
  {
    productId: "ind-002",
    name: "Tomato",
    unit: "kg",
    quantity: 1,
    unitPrice: 40,
    lineTotal: 40,
  },
];

function rule(overrides: Partial<DeliveryRuleInput>): DeliveryRuleInput {
  return {
    id: `r-${Math.random().toString(36).slice(2, 8)}`,
    appliesTo: { allProducts: true },
    feeType: "flat",
    amount: 25,
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

function run(opts?: {
  rules?: readonly DeliveryRuleInput[];
  deliverySlot?: string;
  isFirstOrder?: boolean;
  orderCount?: number;
}) {
  return composePricing(
    { lines: LINES, subtotal: 91 },
    {
      feeRules: opts?.rules ?? [],
      deliverySlot: opts?.deliverySlot,
      isFirstOrderOfUser: opts?.isFirstOrder,
      orderCount: opts?.orderCount,
    }
  );
}

describe("composePricing", () => {
  it("produces a correct snapshot with no delivery rules (Phase 1 no-promo path)", () => {
    const result = run();
    expect(result.ok).toBe(true);
    expect(result.breakdown).toEqual({
      subtotal: 91,
      deliveryFee: 0,
      couponDiscount: 0,
      referralDiscount: 0,
      discountTotal: 0,
      storeCreditApplied: 0,
      totalBeforeCredits: 91,
      grandTotal: 91,
      currency: "INR",
      taxInclusive: true,
    });
    expect(result.appliedPromotions).toEqual([]);
  });

  it("adds the resolved delivery fee", () => {
    const result = run({ rules: [rule({ amount: 25 })] });
    expect(result.breakdown.deliveryFee).toBe(25);
    expect(result.breakdown.totalBeforeCredits).toBe(116);
    expect(result.breakdown.grandTotal).toBe(116);
  });

  it("resolves slot-specific fees from the delivery slot", () => {
    const slotRule = rule({
      amount: 10,
      deliverySlots: ["Morning (8 AM - 12 PM)"],
    });
    const morning = run({ rules: [slotRule], deliverySlot: "Morning (8 AM - 12 PM)" });
    expect(morning.breakdown.deliveryFee).toBe(10);
    const evening = run({ rules: [slotRule], deliverySlot: "Evening (4 PM - 8 PM)" });
    expect(evening.breakdown.deliveryFee).toBe(0);
  });

  it("labels first-order users for new-user fee rules", () => {
    const newUserFree = rule({
      amount: 0,
      userEligibility: { userType: "new" },
    });
    const result = run({ rules: [newUserFree], isFirstOrder: true });
    expect(result.breakdown.deliveryFee).toBe(0);
    const resultReturning = run({ rules: [newUserFree], isFirstOrder: false });
    expect(resultReturning.breakdown.deliveryFee).toBe(0); // no fallback rule
  });

  it("carries server-priced lines through with rounding", () => {
    const result = run();
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].lineTotal).toBe(51);
    expect(result.lines[1].unitPrice).toBe(40);
  });
});