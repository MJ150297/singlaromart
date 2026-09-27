import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { Refund } from "@/lib/models/Refund";
import { releaseCouponRedemption } from "@/lib/pricing/validateCoupon";
import { restoreStoreCredit } from "@/lib/pricing/credits";
import { buildAuditEvent } from "@/lib/promotionAudit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const { id } = await params;
  const body = await request.json() as { status?: string; reason?: string; note?: string };
  const refund = await Refund.findOne({ id });
  if (!refund) return NextResponse.json({ success: false, error: "Refund not found" }, { status: 404 });
  if (body.status !== "processed") return NextResponse.json({ success: false, error: "Only processing refunds is supported." }, { status: 400 });
  if (refund.status === "processed") return NextResponse.json({ success: true, data: refund });
  const order = await Order.findOne({ orderId: refund.orderId }).lean();
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  await releaseCouponRedemption(refund.orderId);
  if (order.userId && order.pricing?.storeCreditApplied) await restoreStoreCredit(order.userId, order.pricing.storeCreditApplied, order.orderId);
  const updated = await Refund.findOneAndUpdate({ id, status: { $ne: "processed" } }, { $set: { status: "processed", refundedAt: new Date(), processedBy: session?.user?.email || "owner", reason: body.reason || refund.reason, note: body.note || refund.note } }, { returnDocument: "after" }).lean();
  const auditEvent = buildAuditEvent({
    entityType: "refund",
    entityId: refund.id,
    eventType: "refund.process",
    actor: session?.user?.email || "owner",
    actorRole: "owner",
    summary: "Refund processed and promotion reversals applied",
    details: { orderId: refund.orderId, refundAmount: refund.refundableAmount, processedBy: session?.user?.email || "owner" },
    severity: "high",
    status: "resolved",
  });
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/admin/audit-events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(auditEvent),
  }).catch(() => undefined);
  return NextResponse.json({ success: true, data: updated });
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const body = await request.json() as { orderId?: string; reason?: string; note?: string };
  if (!body.orderId || !body.reason) return NextResponse.json({ success: false, error: "orderId and reason are required" }, { status: 400 });
  const order = await Order.findOne({ orderId: body.orderId }).lean();
  if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
  const refund = await Refund.findOneAndUpdate({ orderId: body.orderId }, { $setOnInsert: { id: `refund_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`, orderId: body.orderId, userId: order.userId, refundableAmount: order.totalAmount, reason: body.reason, note: body.note, status: "requested" } }, { upsert: true, returnDocument: "after" }).lean();
  return NextResponse.json({ success: true, data: refund }, { status: 201 });
}