import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { orderId } = await params;

  try {
    await connectToDatabase();

    const order = await Order.findOne({
      orderId,
      userId: session.user.id,
    }).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (err: unknown) {
    console.error("Fetch my order error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch order" },
      { status: 500 }
    );
  }
}