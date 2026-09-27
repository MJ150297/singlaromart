import { z } from "zod";
import { CustomerDetailsSchema } from "../schemas";
import { fetchJson } from "./client";
import type { PricingBreakdown } from "../pricing/types";

const OrderItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
});

export const CreateOrderSchema = z.object({
  customer: CustomerDetailsSchema,
  items: z.array(OrderItemSchema).min(1),
  couponCode: z.string().trim().max(32).optional(),
  idempotencyKey: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Invalid idempotency key")
    .optional(),
  useCredits: z.boolean().optional(),
});

export type CreateOrderPayload = z.infer<typeof CreateOrderSchema>;

export interface OrderResponse {
  orderId: string;
  totalAmount: number;
  status: string;
  pricing?: PricingBreakdown;
  appliedPromotions?: Array<{
    type: "coupon" | "referral_benefit" | "store_credit";
    code?: string;
    promotionId?: string;
    amount: number;
  }>;
}

/**
 * Client-safe: submits an order to the API route.
 * This file must NOT import any server-only modules (mongoose, models, db).
 */
export async function submitOrder(payload: CreateOrderPayload) {
  return fetchJson<{ success: boolean; data: OrderResponse; error?: string; code?: string }>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
