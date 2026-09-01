import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";

// Whitelist of fields allowed on update to prevent injection of arbitrary data
const ALLOWED_FIELDS = [
  "id", "name", "slug", "description", "icon", "image",
  "subcategories", "parentId", "sortOrder", "isActive",
  "metaTitle", "metaDescription",
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

function validationError(data: Record<string, unknown>): string | null {
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim())) return "Category name is required";
  if (data.sortOrder !== undefined && (!Number.isFinite(Number(data.sortOrder)) || Number(data.sortOrder) < 0)) {
    return "Sort order must be a non-negative number";
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    return "isActive must be a boolean";
  }
  if (data.subcategories !== undefined) {
    if (!Array.isArray(data.subcategories)) return "Subcategories must be an array";
    for (const [index, sub] of data.subcategories.entries()) {
      if (!sub || typeof sub !== "object") return `Subcategory ${index + 1} is invalid`;
      const item = sub as Record<string, unknown>;
      if (typeof item.name !== "string" || !item.name.trim()) return `Subcategory ${index + 1} needs a name`;
    }
  }
  return null;
}

async function revalidateCategoryPaths() {
  await revalidatePath("/");
  await revalidatePath("/api/categories");
  await revalidatePath("/api/admin/categories");
  await revalidatePath("/api/products");
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
    if (errorMessage) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    // Fetch the existing category to compare old vs new images
    const existing = await Category.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Auto-generate slug from name if name changed and slug missing
    if (data.name && (!data.slug || String(data.slug).trim() === "")) {
      data.slug = slugify(String(data.name));
    }

    // Enforce slug uniqueness (excluding self)
    if (data.slug) {
      const dup = await Category.findOne({ slug: data.slug, id: { $ne: id } }).lean();
      if (dup) {
        return NextResponse.json(
          { success: false, error: "A category with this slug already exists" },
          { status: 409 }
        );
      }
    }

    // Auto-generate subcategory IDs and slugs if missing
    if (Array.isArray(data.subcategories)) {
      data.subcategories = (data.subcategories as Array<Record<string, unknown>>).map(
        (sub, idx) => {
          const name = String(sub.name || "").trim();
          const slug = String(sub.slug || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          return {
            ...sub,
            id: String(sub.id || "").trim() || `sub-${id}-${idx + 1}`,
            slug:
              slug ||
              name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, ""),
          };
        }
      );
    }

    const category = await Category.findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete Cloudinary images that are no longer referenced.
    const oldIds = collectPublicIds(
      existing.image,
      (existing.subcategories || []).map((s: { image?: unknown }) => s.image)
    );
    const newIds = collectPublicIds(
      category.image,
      (category.subcategories || []).map((s: { image?: unknown }) => s.image)
    );
    const toDelete = oldIds.filter((pid) => !newIds.includes(pid));

    const warnings: string[] = [];
    if (toDelete.length > 0) {
      const { failed } = await deleteCloudinaryImages(toDelete);
      if (failed.length > 0) {
        warnings.push(
          `Failed to delete ${failed.length} old image(s) from Cloudinary: ${failed.join(", ")}`
        );
      }
    }

    await revalidateCategoryPaths();

    return NextResponse.json({ success: true, data: category, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update category" },
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

    const update: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") update.isActive = body.isActive;
    if (body.sortOrder !== undefined) {
      const n = Number(body.sortOrder);
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Invalid sort order" }, { status: 400 });
      }
      update.sortOrder = n;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const category = await Category.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    await revalidateCategoryPaths();

    return NextResponse.json({ success: true, data: category });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update category" },
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

    const existing = await Category.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Delete safety: block deletion if products reference this category
    const referencedProducts = await Product.countDocuments({
      $or: [{ categoryId: id }, { category: existing.name }],
    });

    if (referencedProducts > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete "${existing.name}" — ${referencedProducts} product(s) reference this category. Reassign or delete those products first.`,
          data: { productCount: referencedProducts },
        },
        { status: 409 }
      );
    }

    const result = await Category.findOneAndDelete({ id });

    // Cascade cleanup: delete all Cloudinary images associated with the category
    const publicIds = collectPublicIds(
      result?.image,
      (result?.subcategories || []).map((s: { image?: unknown }) => s.image)
    );
    const warnings: string[] = [];
    if (publicIds.length > 0) {
      const { failed } = await deleteCloudinaryImages(publicIds);
      if (failed.length > 0) {
        warnings.push(
          `Failed to delete ${failed.length} image(s) from Cloudinary: ${failed.join(", ")}`
        );
      }
    }

    await revalidateCategoryPaths();

    return NextResponse.json({ success: true, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete category" },
      { status: 500 }
    );
  }
}
