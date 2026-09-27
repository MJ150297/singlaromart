import { describe, expect, it } from "vitest";
import { summarizePromotionMetrics } from "./promotionReports";

describe("summarizePromotionMetrics", () => {
  it("builds a stable summary from raw promotion metrics", () => {
    const summary = summarizePromotionMetrics({
      orders: 120,
      couponsRedeemed: 14,
      referralAttributions: 18,
      referralRewardsIssued: 9,
      creditIssued: 4200,
      creditSpent: 3000,
      refundAmount: 850,
      discountAmount: 1250,
      totalRevenue: 28400,
    });

    expect(summary.orders).toBe(120);
    expect(summary.couponRedemptionRate).toBe(11.67);
    expect(summary.referralConversionRate).toBe(50);
    expect(summary.netCreditFlow).toBe(1200);
    expect(summary.totalDiscountRate).toBe(4.4);
  });
});
