import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/errors";

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

    // Fetch the existing banner to compare old vs new image
    const existing = await Banner.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    const banner = await Banner.findOneAndUpdate(
      { id },
      { $set: body },
      { new: true, runValidators: true }
    ).lean();

    if (!banner) {
      return NextResponse.json(
        { success: false, error: "Banner not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete the old Cloudinary image if it was replaced.
    // Old image = existing banner's image.
    // New image = updated banner's image.
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

    return NextResponse.json({ success: true, data: banner, warnings });
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

    return NextResponse.json({ success: true, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to delete banner" },
      { status: 500 }
    );
  }
}
