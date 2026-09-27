import { fetchJson } from "./client";
import type { PricingCartOutput } from "../pricing/types";

/**
 * Client-safe: requests a server-computed pricing preview for the checkout UI.
 * This file must NOT import any server-only modules (mongoose, models, db).
 */
export async function previewCheckout(payload: {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  couponCode?: string;
}): Promise<{ success: boolean; data?: PricingCartOutput; error?: string }> {
  return fetchJson("/checkout/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}