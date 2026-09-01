import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/errors";

// Whitelist of fields allowed on update to prevent injection of arbitrary data
const ALLOWED_FIELDS = [
  "id", "title", "subtitle", "badge", "gradient", "cta",
  "image", "order", "isActive",
];

function pickAllowed(body: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

function validationError(data: Record<string, unknown>): string | null {
  if (data.title !== undefined && (typeof data.title !== "string" || !data.title.trim())) return "Banner title is required";
  if (data.order !== undefined && (!Number.isFinite(Number(data.order)) || Number(data.order) < 0)) {
    return "Order must be a non-negative number";
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    return "isActive must be a boolean";
  }
  return null;
}

async function revalidateBannerPaths() {
  await revalidatePath("/");
  await revalidatePath("/api/banners");
  await revalidatePath("/api/admin/banners");
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

    // Fetch the existing banner to compare old vs new image
    const existing = await Banner.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    // Normalize order to a number
    if (data.order !== undefined) data.order = Number(data.order);

    const banner = await Banner.findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete the old Cloudinary image if it was replaced.
    const oldIds = collectPublicIds(existing.image);
    const newIds = collectPublicIds(banner.image);
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

    await revalidateBannerPaths();

    return NextResponse.json({ success: true, data: banner, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update banner" },
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
    if (body.order !== undefined) {
      const n = Number(body.order);
      if (isNaN(n) || n < 0) {
        return NextResponse.json({ success: false, error: "Invalid order" }, { status: 400 });
      }
      update.order = n;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: "No valid fields to update" }, { status: 400 });
    }

    const banner = await Banner.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    await revalidateBannerPaths();

    return NextResponse.json({ success: true, data: banner });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update banner" },
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

    const result = await Banner.findOneAndDelete({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete the banner's Cloudinary image
    const publicIds = collectPublicIds(result.image);
    const warnings: string[] = [];
    if (publicIds.length > 0) {
      const { failed } = await deleteCloudinaryImages(publicIds);
      if (failed.length > 0) {
        warnings.push(
          `Failed to delete ${failed.length} image(s) from Cloudinary: ${failed.join(", ")}`
        );
      }
    }

    await revalidateBannerPaths();

    return NextResponse.json({ success: true, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete banner" },
      { status: 500 }
    );
  }
}
