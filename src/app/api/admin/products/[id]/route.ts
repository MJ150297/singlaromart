import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/lib/models/Product";
import { Category } from "@/lib/models/Category";
import { getErrorMessage } from "@/lib/errors";
import { normalizeCatalogLabels } from "@/lib/catalog-normalization";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";
import type { CloudinaryImage } from "@/lib/schemas";

// Whitelist of fields allowed on update to prevent injection of arbitrary data
const ALLOWED_FIELDS = [
  "id", "name", "slug", "category", "categoryId", "price", "unit", "image",
  "images", "inStock", "description", "origin", "badges", "originalPrice",
  "discountPercent", "nutritionalInfo", "storageInfo", "healthFact", "variants",
  "subcategories", "subcategoryId", "tags", "stockQuantity", "isPublished",
];

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validationError(data: Record<string, unknown>): string | null {
  for (const field of ["price", "originalPrice", "stockQuantity"] as const) {
    if (data[field] !== undefined && (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0)) return `${field} must be a non-negative number`;
  }
  if (data.discountPercent !== undefined && (!Number.isFinite(Number(data.discountPercent)) || Number(data.discountPercent) < 0 || Number(data.discountPercent) > 100)) return "Discount must be between 0 and 100";
  if (data.inStock === true && Number(data.stockQuantity ?? 0) <= 0) return "A product cannot be marked In Stock with zero quantity";
  if (Array.isArray(data.variants)) {
    for (const [index, variant] of data.variants.entries()) {
      if (!variant || typeof variant !== "object") return `Variant ${index + 1} is invalid`;
      const item = variant as Record<string, unknown>;
      if (typeof item.unit !== "string" || !item.unit.trim()) return `Variant ${index + 1} needs a unit`;
      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) return `Variant ${index + 1} needs a valid price`;
      if (item.discountPercent !== undefined && (!Number.isFinite(Number(item.discountPercent)) || Number(item.discountPercent) < 0 || Number(item.discountPercent) > 100)) return `Variant ${index + 1} discount must be between 0 and 100`;
    }
  }
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const data = pickAllowed(body);
    const errorMessage = validationError(data);
    if (errorMessage) return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });

    const existing = await Product.findOne({ id }).lean();
    if (!existing) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    const categoryId = String(data.categoryId ?? existing.categoryId ?? "");
    if (!categoryId) return NextResponse.json({ success: false, error: "Category is required" }, { status: 400 });
    if (data.image === undefined && !existing.image) return NextResponse.json({ success: false, error: "A main product image is required" }, { status: 400 });
    const category = await Category.findOne({ id: categoryId }).lean();
    if (!category) return NextResponse.json({ success: false, error: "Selected category was not found" }, { status: 400 });
    if (Array.isArray(data.subcategories)) {
      const validNames = new Set((category.subcategories || []).map((sub: { name?: string }) => String(sub.name ?? "").trim().toLowerCase()));
      const invalid = (data.subcategories as unknown[]).some((name) => !validNames.has(String(name).trim().toLowerCase()));
      if (invalid) return NextResponse.json({ success: false, error: "One or more subcategories do not belong to the selected category" }, { status: 400 });
    }
    if (data.tags !== undefined) data.tags = normalizeCatalogLabels(Array.isArray(data.tags) ? data.tags : []);
    if (data.badges !== undefined) data.badges = normalizeCatalogLabels(Array.isArray(data.badges) ? data.badges : []);
    const resultingInStock = data.inStock === undefined ? Boolean(existing.inStock) : data.inStock === true;
    const resultingQuantity = data.stockQuantity === undefined ? Number(existing.stockQuantity ?? 0) : Number(data.stockQuantity);
    if (resultingInStock && resultingQuantity <= 0) return NextResponse.json({ success: false, error: "A product cannot be marked In Stock with zero quantity" }, { status: 400 });

    // Auto-generate slug from name if name is provided and slug is missing
    if (data.name && (!data.slug || String(data.slug).trim() === "")) {
      data.slug = slugify(String(data.name));
    }

    const product = await Product.findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const existing = await Product.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = {};

    if (typeof body.isPublished === "boolean") update.isPublished = body.isPublished;
    if (typeof body.inStock === "boolean") update.inStock = body.inStock;
    if (body.stockQuantity !== undefined) {
      const qty = Number(body.stockQuantity);
      if (isNaN(qty) || qty < 0) {
        return NextResponse.json({ success: false, error: "Invalid stock quantity" }, { status: 400 });
      }
      update.stockQuantity = qty;
    }

    const resultingInStock = update.inStock === undefined ? Boolean(existing.inStock) : update.inStock === true;
    const resultingQuantity = update.stockQuantity === undefined ? Number(existing.stockQuantity ?? 0) : Number(update.stockQuantity);
    if (resultingInStock && resultingQuantity <= 0) {
      return NextResponse.json({ success: false, error: "A product cannot be marked In Stock with zero quantity" }, { status: 400 });
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const product = await Product.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after", runValidators: true }
    ).lean();

    return NextResponse.json({ success: true, data: product });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const { id } = await params;
    await connectToDatabase();

    const existing = await Product.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    await Product.findOneAndDelete({ id });

    // Clean up Cloudinary images (best-effort, non-blocking)
    const publicIds = collectPublicIds(
      existing.image as string | CloudinaryImage | undefined,
      existing.images as Array<string | CloudinaryImage> | undefined,
      ...((existing.variants as Array<{ image?: string | CloudinaryImage }>) || []).map((v) => v.image)
    );
    if (publicIds.length > 0) {
      const { failed } = await deleteCloudinaryImages(publicIds);
      if (failed.length > 0) {
        return NextResponse.json({
          success: true,
          data: { deleted: true },
          warnings: [`Product deleted but ${failed.length} image(s) could not be removed from storage`],
        });
      }
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete product" },
      { status: 500 }
    );
  }
}
