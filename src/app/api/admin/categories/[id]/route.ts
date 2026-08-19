import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";

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

    // Fetch the existing category to compare old vs new images
    const existing = await Category.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Auto-generate subcategory IDs and slugs if missing
    if (Array.isArray(body.subcategories)) {
      body.subcategories = body.subcategories.map(
        (sub: Record<string, unknown>, idx: number) => {
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
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete Cloudinary images that are no longer referenced.
    // Old images = existing category's main image + all subcategory images.
    // New images = updated category's main image + all subcategory images.
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

    return NextResponse.json({ success: true, data: category, warnings });
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

    const result = await Category.findOneAndDelete({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete all Cloudinary images associated with the category
    // (main image + all subcategory images)
    const publicIds = collectPublicIds(
      result.image,
      (result.subcategories || []).map((s: { image?: unknown }) => s.image)
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

    return NextResponse.json({ success: true, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete category" },
      { status: 500 }
    );
  }
}
