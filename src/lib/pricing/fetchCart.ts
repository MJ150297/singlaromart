import { connectToDatabase } from "@/lib/db/mongoose";
import { Product, ProductDocument } from "@/lib/models/Product";
import { moneyScale, moneySum } from "./money";
import { CartItemInput, PricingError, PricingLine } from "./types";

/**
 * Server-side cart fetching and canonical pricing.
 *
 * The client submits only IDs + quantities — NEVER prices. This module
 * re-fetches products from MongoDB, validates availability, and computes the
 * authoritative line totals through the money helpers.
 *
 * Server-only: must not be imported from client components.
 */

/** Per-line stock check policy: block when the boolean flag is off, or when a
 *  maintained positive `stockQuantity` is exceeded. Products with unset/zero
 *  stock quantities are treated as available (legacy seed data). */
const MAX_QUANTITY = 100;

export interface FetchedCart {
  /** Canonical lines, duplicates merged by (productId, variantId). */
  lines: PricingLine[];
  subtotal: number;
  /** Grouped availability failures (one per distinct product/variant). */
  errors: PricingError[];
}

/**
 * Fetches and prices all items in a single batched query.
 * @throws on database failure.
 */
export async function fetchCartItems(
  items: CartItemInput[]
): Promise<FetchedCart> {
  await connectToDatabase();

  // Merge duplicates up-front so stock checks and eligibility see one line
  // per (productId, variantId).
  const merged = new Map<string, { input: CartItemInput; quantity: number }>();
  for (const item of items) {
    const key = `${item.productId}\u0000${item.variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(
        MAX_QUANTITY,
        existing.quantity + Math.max(1, item.quantity)
      );
    } else {
      const quantity = Math.min(MAX_QUANTITY, Math.max(1, item.quantity));
      merged.set(key, { input: item, quantity });
    }
  }

  const productIds = [...new Set(Array.from(merged.values()).map((m) => m.input.productId))];
  const productsRaw = await Product.find({ id: { $in: productIds } }).lean();
  const products = new Map(
    (productsRaw as ProductDocument[]).map((p) => [p.id, p] as const)
  );

  const lines: PricingLine[] = [];
  const errors: PricingError[] = [];
  const seenErrors = new Set<string>();

  for (const { input, quantity } of merged.values()) {
    const product = products.get(input.productId);
    if (!product) {
      errors.push({ code: "PRODUCT_UNAVAILABLE", message: "One or more items are no longer available." });
      continue;
    }
    if (product.isPublished === false || product.inStock === false) {
      if (!seenErrors.has(input.productId)) {
        seenErrors.add(input.productId);
        errors.push({ code: "PRODUCT_UNAVAILABLE", message: `${product.name} is currently unavailable.` });
      }
      continue;
    }
    if (
      typeof product.stockQuantity === "number" &&
      product.stockQuantity > 0 &&
      quantity > product.stockQuantity
    ) {
      if (!seenErrors.has(input.productId)) {
        seenErrors.add(input.productId);
        errors.push({ code: "OUT_OF_STOCK", message: `Only ${product.stockQuantity} unit(s) of ${product.name} are available.` });
      }
      continue;
    }

    let unitPrice = product.price ?? 0;
    let variantInStock: boolean | undefined;
    let variantImage: unknown;

    if (input.variantId && product.variants) {
      const variants = product.variants as Array<{
        unit?: string;
        price?: number;
        inStock?: boolean;
        image?: unknown;
      }> | undefined;
      const variant = variants?.find((v) => v.unit === input.variantId);
      if (variant) {
        if (typeof variant.price === "number") unitPrice = variant.price;
        variantInStock = variant.inStock;
        variantImage = variant.image;
      }
    }

    if (variantInStock === false) {
      if (!seenErrors.has(input.productId)) {
        seenErrors.add(input.productId);
        errors.push({ code: "OUT_OF_STOCK", message: `${product.name} (${input.variantId}) is out of stock.` });
      }
      continue;
    }

    const lineTotal = moneyScale(unitPrice, quantity);
    lines.push({
      productId: product.id,
      variantId: input.variantId,
      name: product.name,
      unit: product.unit,
      image: variantImage ?? product.image,
      quantity,
      unitPrice,
      lineTotal,
      categoryId: product.categoryId || undefined,
      subcategoryId: product.subcategoryId || undefined,
    });
  }

  return {
    lines,
    subtotal: moneySum(lines.map((l) => l.lineTotal)),
    errors,
  };
}