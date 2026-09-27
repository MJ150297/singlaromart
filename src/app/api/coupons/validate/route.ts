import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { calculateCart } from "@/lib/pricing/calculateCart";
import { CartItemInputSchema } from "@/lib/pricing/types";

const RequestSchema = z.object({
  code: z.string().trim().min(1).max(32),
  items: z.array(CartItemInputSchema).min(1),
});

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Please login to use coupons." }, { status: 401 });
    await connectToDatabase();
    const orderCount = await Order.countDocuments({ userId: session.user.id, status: { $nin: ["cancelled"] }, paymentStatus: { $nin: ["failed"] } });
    const result = await calculateCart({ items: input.items, couponCode: input.code, userId: session.user.id, orderCount });
    if (!result.ok) return NextResponse.json({ success: false, code: result.error.code, error: result.error.message }, { status: 400 });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    return NextResponse.json({ success: false, error: "Unable to validate coupon." }, { status: 500 });
  }
}