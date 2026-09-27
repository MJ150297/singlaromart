import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Order } from "@/lib/models/Order";
import { calculateCart } from "@/lib/pricing/calculateCart";
import { CartItemInputSchema } from "@/lib/pricing/types";

/**
 * POST /api/checkout/preview
 * Server-computed pricing preview for the checkout UI. Best-effort: returns
 * `{ ok: false }` in the 200 body when the cart is unpurchasable (e.g. coupon
 * rejected), and 400/500 only for malformed requests / server errors.
 */
const PreviewRequestSchema = z.object({
  items: z.array(CartItemInputSchema).min(1),
  couponCode: z.string().trim().max(32).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = PreviewRequestSchema.parse(body);

    // Optional auth — used only to resolve user-scoped delivery rules.
    let userId: string | undefined;
    let orderCount: number | undefined;
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
      await connectToDatabase();
      orderCount = await Order.countDocuments({
        userId,
        status: { $nin: ["cancelled"] },
        paymentStatus: { $nin: ["failed"] },
      });
    }

    const pricing = await calculateCart({
      items: parsed.items,
      userId,
      orderCount,
      couponCode: parsed.couponCode,
    });

    return NextResponse.json({ success: true, data: pricing });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to preview pricing" },
      { status: 500 }
    );
  }
}