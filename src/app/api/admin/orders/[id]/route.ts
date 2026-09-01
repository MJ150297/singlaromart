import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";

const VALID_STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"];
const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed"];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;
  try {
    const { id } = await params;
    await connectToDatabase();
    const order = await Order.findOne({ orderId: id }).lean();
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: order });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, internalNotes, deliveryNotes } = body;
    await connectToDatabase();

    const existing = await Order.findOne({ orderId: id }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      if (status !== existing.status) {
        update.status = status;
        update.statusHistory = [
          ...((existing.statusHistory as Array<Record<string, unknown>>) || []),
          {
            status,
            changedAt: new Date(),
            changedBy: "admin",
            note: body.note || "",
          },
        ];
      }
    }

    if (paymentStatus) {
      if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
        return NextResponse.json({ success: false, error: "Invalid payment status" }, { status: 400 });
      }
      update.paymentStatus = paymentStatus;
    }

    if (typeof internalNotes === "string") {
      update.internalNotes = internalNotes;
    }
    if (typeof deliveryNotes === "string") {
      update.deliveryNotes = deliveryNotes;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: id },
      update,
      { returnDocument: "after", runValidators: true }
    ).lean();
    return NextResponse.json({ success: true, data: order });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;
  try {
    const { id } = await params;
    await connectToDatabase();
    const result = await Order.findOneAndDelete({ orderId: id });
    if (!result) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete order" },
      { status: 500 }
    );
  }
}
