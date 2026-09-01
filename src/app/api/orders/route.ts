import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { z, ZodError } from "zod";
import { auth } from "@/auth";
import { createOrder } from "@/lib/orders/createOrder";
import { CustomerDetailsSchema } from "@/lib/schemas";

const OrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
});

const CreateOrderSchema = z.object({
  customer: CustomerDetailsSchema,
  items: z.array(OrderItemSchema).min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ success: false, error: "Please login to place an order." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const userId = session.user.id;

    const body = await req.json();
    const payload = CreateOrderSchema.parse(body);
    const order = await createOrder(payload, userId);
    return new Response(JSON.stringify({ success: true, data: order }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return new Response(JSON.stringify({ success: false, error: err.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: false, error: getErrorMessage(err) || String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
