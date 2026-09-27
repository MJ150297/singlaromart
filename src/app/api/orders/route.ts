import { getErrorMessage } from "@/lib/errors";
import { ZodError } from "zod";
import { auth } from "@/auth";
import {
  CreateOrderSchema,
  PricingRejectionError,
  createOrder,
} from "@/lib/orders/createOrder";

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
    const { order, replayed } = await createOrder(payload, userId);
    return new Response(JSON.stringify({ success: true, data: order }), {
      status: replayed ? 200 : 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    if (err instanceof PricingRejectionError) {
      return new Response(
        JSON.stringify({ success: false, error: err.message, code: err.code }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
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
