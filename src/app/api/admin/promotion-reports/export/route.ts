import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { buildPromotionReportCsv } from "@/lib/promotionReports";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  await connectToDatabase();

  const [orders, ledger] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(250).lean(),
    RewardLedger.find().sort({ createdAt: -1 }).limit(250).lean(),
  ]);

  const rows = [
    {
      orderId: "orderId",
      createdAt: "createdAt",
      totalAmount: "totalAmount",
      discountAmount: "discountAmount",
      storeCreditApplied: "storeCreditApplied",
      status: "status",
      entryId: "entryId",
      delta: "delta",
      reason: "reason",
    },
    ...orders.map((order) => ({
      orderId: order.orderId,
      createdAt: new Date(order.createdAt ?? Date.now()).toISOString(),
      totalAmount: order.totalAmount ?? 0,
      discountAmount: order.pricing?.discountTotal ?? 0,
      storeCreditApplied: order.pricing?.storeCreditApplied ?? 0,
      status: order.status ?? "pending",
      entryId: "",
      delta: "",
      reason: "",
    })),
    ...ledger.map((entry) => ({
      orderId: "",
      createdAt: new Date(entry.createdAt ?? Date.now()).toISOString(),
      totalAmount: "",
      discountAmount: "",
      storeCreditApplied: "",
      status: "",
      entryId: entry.entryId,
      delta: entry.delta,
      reason: entry.reason,
    })),
  ];

  return new NextResponse(buildPromotionReportCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="promotion-report.csv"',
    },
  });
}
