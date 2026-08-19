import { z } from "zod";
import { CustomerDetailsSchema } from "../schemas";
import { fetchJson } from "./client";

const OrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

const CreateOrderSchema = z.object({
  customer: CustomerDetailsSchema,
  items: z.array(OrderItemSchema).min(1),
});

export type CreateOrderPayload = z.infer<typeof CreateOrderSchema>;

export interface OrderResponse {
  orderId: string;
  totalAmount: number;
  status: string;
}

/**
 * Client-safe: submits an order to the API route.
 * This file must NOT import any server-only modules (mongoose, models, db).
 */
export async function submitOrder(payload: CreateOrderPayload) {
  return fetchJson<{ success: boolean; data: OrderResponse; error?: string }>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
