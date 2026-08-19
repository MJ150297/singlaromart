import { z } from "zod";
import { CustomerDetailsSchema } from "../schemas";
import { connectToDatabase } from "../db/mongoose";
import { Order } from "../models/Order";
import { Product, ProductDocument } from "../models/Product";

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

/**
 * Server-only: persists an order to MongoDB.
 * This file must NOT be imported from any client component.
 */
export async function createOrder(
  payload: CreateOrderPayload,
  userId?: string
) {
  const parsed = CreateOrderSchema.parse(payload);

  await connectToDatabase();

  // Compute totals + enrich items with product details from Mongo
  let total = 0;
  const detailedItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    name?: string;
    unit?: string;
    image?: unknown;
  }> = [];

  for (const it of parsed.items) {
    const product = await Product.findOne({ id: it.productId }).lean();

    let unitPrice = product ? product.price : 0;
    let variantImage: unknown;
    // If a variant is specified, use the variant's price and image
    if (it.variantId && product) {
      const variants = (product as ProductDocument).variants as Array<{ unit?: string; price?: number; image?: unknown }> | undefined;
      const variant = variants?.find((v) => v.unit === it.variantId);
      if (variant && typeof variant.price === "number") {
        unitPrice = variant.price;
      }
      variantImage = variant?.image;
    }

    total += unitPrice * it.quantity;
    detailedItems.push({
      productId: it.productId,
      variantId: it.variantId,
      quantity: it.quantity,
      unitPrice,
      name: product ? (product as ProductDocument).name : undefined,
      unit: product ? (product as ProductDocument).unit : undefined,
      // Variant image if available, otherwise fall back to the product image
      image: variantImage || (product ? (product as ProductDocument).image : undefined),
    });
  }

  const orderId = `ord_${Date.now()}`;
  const order = await Order.create({
    orderId,
    status: "pending",
    totalAmount: total,
    estimatedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    customer: parsed.customer,
    items: detailedItems,
    userId: userId || null,
    createdAt: new Date().toISOString(),
  });

  return order.toJSON();
}