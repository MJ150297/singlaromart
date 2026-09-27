import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { CouponRedemption } from "@/lib/models/CouponRedemption";
import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralReward } from "@/lib/models/ReferralReward";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { Refund } from "@/lib/models/Refund";
import { summarizePromotionMetrics } from "@/lib/promotionReports";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  await connectToDatabase();

  const [orders, coupons, attributions, rewards, ledger, refunds] = await Promise.all([
    Order.countDocuments(),
    CouponRedemption.countDocuments({ status: "redeemed" }),
    ReferralAttribution.countDocuments(),
    ReferralReward.countDocuments({ status: "awarded" }),
    RewardLedger.aggregate([
      { $group: { _id: null, issued: { $sum: { $max: ["$delta", 0] } }, spent: { $sum: { $max: ["$delta", 0] } } } },
    ]),
    Refund.countDocuments({ status: "processed" }),
  ]);

  const totalCreditIssued = ledger[0]?.issued ?? 0;
  const totalCreditSpent = ledger[0]?.spent ?? 0;

  const totalRevenue = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]).then((rows) => rows[0]?.total ?? 0);

  const totalDiscount = await Order.aggregate([
    { $group: { _id: null, total: { $sum: "$pricing.couponDiscount" } } },
  ]).then((rows) => rows[0]?.total ?? 0);

  const summary = summarizePromotionMetrics({
    orders,
    couponsRedeemed: coupons,
    referralAttributions: attributions,
    referralRewardsIssued: rewards,
    creditIssued: totalCreditIssued,
    creditSpent: totalCreditSpent,
    refundAmount: 0,
    discountAmount: totalDiscount,
    totalRevenue,
  });

  return NextResponse.json({ success: true, data: summary });
}
