import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { Notification } from "@/lib/models/Notification";
import { sendPushToUser } from "@/lib/push";
import { redeemCouponRedemption, releaseCouponRedemption } from "@/lib/pricing/validateCoupon";
import { qualifyReferralForDeliveredOrder } from "@/lib/referrals";

const VALID_STATUSES = ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"];
const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed"];

/** Build the in-app notification copy shown to the customer for a status change. */
function statusNotification(status: string, orderId: string) {
  const map: Record<string, { title: string; message: string }> = {
    confirmed: {
      title: "Order confirmed",
      message: `Your order ${orderId} has been confirmed. We're packing your groceries!`,
    },
    out_for_delivery: {
      title: "Out for delivery",
      message: `Good news! Your order ${orderId} is out for delivery.`,
    },
    delivered: {
      title: "Order delivered",
      message: `Your order ${orderId} has been delivered. Enjoy your groceries!`,
    },
    cancelled: {
      title: "Order cancelled",
      message: `Your order ${orderId} was cancelled. Contact us on WhatsApp if you need help.`,
    },
  };
  return map[status];
}

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
    let statusChanged: string | null = null;

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
      }
      if (status !== existing.status) {
        statusChanged = status;
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

    if (statusChanged === "delivered") await redeemCouponRedemption(id);
    if (statusChanged === "cancelled") await releaseCouponRedemption(id);
    if (statusChanged === "delivered" && existing.userId) await qualifyReferralForDeliveredOrder(existing.userId, id);

    // Notify the customer (in-app notification + Web Push) when the order
    // status changes. Only registered users (order.userId) receive these.
    if (statusChanged && existing.userId && typeof existing.userId === "string") {
      const template = statusNotification(statusChanged, id);
      if (template) {
        try {
          const notification = await Notification.create({
            userId: existing.userId,
            type: "order",
            title: template.title,
            message: template.message,
            link: `/orders/${id}`,
            read: false,
          });
          // Attempt delivery before returning so the order event is handled
          // end-to-end even on short-lived/serverless route-handler workers.
          await sendPushToUser(existing.userId, {
            title: template.title,
            body: template.message,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            url: `/orders/${id}`,
          });
          console.log(
            `[notifications] Order ${id} → ${statusChanged}: notification ${notification._id} queued`
          );
        } catch (notifErr) {
          console.error("[notifications] Failed to persist order notification:", notifErr);
        }
      }
    }

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
