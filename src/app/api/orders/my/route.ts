import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

    const orders = await Order.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (err: unknown) {
    console.error("Fetch my orders error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}