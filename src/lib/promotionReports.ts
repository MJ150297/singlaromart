export interface PromotionMetricsInput {
  orders: number;
  couponsRedeemed: number;
  referralAttributions: number;
  referralRewardsIssued: number;
  creditIssued: number;
  creditSpent: number;
  refundAmount: number;
  discountAmount: number;
  totalRevenue: number;
}

export interface PromotionMetricsSummary {
  orders: number;
  couponRedemptionRate: number;
  referralConversionRate: number;
  netCreditFlow: number;
  totalDiscountRate: number;
  refundRate: number;
}

export function summarizePromotionMetrics(input: PromotionMetricsInput): PromotionMetricsSummary {
  const couponRedemptionRate = input.orders > 0 ? Number(((input.couponsRedeemed / input.orders) * 100).toFixed(2)) : 0;
  const referralConversionRate = input.referralAttributions > 0 ? Number(((input.referralRewardsIssued / input.referralAttributions) * 100).toFixed(2)) : 0;
  const netCreditFlow = input.creditIssued - input.creditSpent;
  const totalDiscountRate = input.totalRevenue > 0 ? Number(((input.discountAmount / input.totalRevenue) * 100).toFixed(2)) : 0;
  const refundRate = input.totalRevenue > 0 ? Number(((input.refundAmount / input.totalRevenue) * 100).toFixed(2)) : 0;

  return {
    orders: input.orders,
    couponRedemptionRate,
    referralConversionRate,
    netCreditFlow,
    totalDiscountRate,
    refundRate,
  };
}

export function buildPromotionReportCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (!rows.length) return "metric,value\n";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => {
      const value = row[header];
      const normalized = value == null ? "" : String(value).replace(/"/g, '""');
      return `"${normalized}"`;
    }).join(","));
  }
  return lines.join("\n") + "\n";
}
