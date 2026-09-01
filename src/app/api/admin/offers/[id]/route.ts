import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Offer } from "@/lib/models/Offer";
import { collectPublicIds, deleteCloudinaryImages } from "@/lib/cloudinary";
import { getErrorMessage } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Whitelist of fields allowed on update to prevent injection of arbitrary data
const ALLOWED_FIELDS = [
  "id", "name", "slug", "description", "type", "tag", "productIds",
  "categoryId", "bannerImage", "startsAt", "endsAt", "isActive", "sortOrder",
];

const VALID_TYPES = ["tag", "manual", "category"] as const;

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
  if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim())) {
    return "Offer name is required";
  }

  if (data.type !== undefined) {
    const type = data.type as string;
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return "Selection type must be one of: tag, manual, category";
    }
    if (type === "tag" && (typeof data.tag !== "string" || !data.tag.trim())) {
      return "A tag is required when selection type is 'By Tag'";
    }
    if (type === "category" && (typeof data.categoryId !== "string" || !data.categoryId.trim())) {
      return "A category is required when selection type is 'By Category'";
    }
    if (type === "manual") {
      if (!Array.isArray(data.productIds) || data.productIds.length === 0) {
        return "At least one product must be selected when selection type is 'Manual'";
      }
    }
  }

  if (data.sortOrder !== undefined) {
    const sortOrder = Number(data.sortOrder);
    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      return "Sort order must be a non-negative number";
    }
  }

  if (data.startsAt && data.endsAt) {
    const start = new Date(data.startsAt as string).getTime();
    const end = new Date(data.endsAt as string).getTime();
    if (!isNaN(start) && !isNaN(end) && end < start) {
      return "End date must be on or after the start date";
    }
  }

  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    // Rate limit: 60 update attempts per minute per IP
    const limited = await checkRateLimit({
      key: "admin-offers-update",
      identifier: getClientIp(request),
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    // Fetch the existing offer to compare old vs new banner image
    const existing = await Offer.findOne({ id }).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    const data = pickAllowed(body);

    const errorMessage = validationError(data);
    if (errorMessage) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    // Auto-generate slug from name if missing
    if (data.slug !== undefined && String(data.slug).trim() === "") {
      data.slug = slugify(String(data.name ?? existing.name));
    }

    // Enforce slug uniqueness (case-insensitive), excluding self
    if (data.slug !== undefined) {
      const slug = String(data.slug).toLowerCase();
      const existingSlug = await Offer.findOne({
        slug: { $regex: new RegExp(`^${slug}$`, "i") },
        id: { $ne: id },
      }).lean();
      if (existingSlug) {
        return NextResponse.json(
          { success: false, error: "An offer with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Duplicate detection on update: reject if another active offer uses the same tag/category
    if (data.type === "tag" && data.tag) {
      const dup = await Offer.findOne({
        type: "tag",
        tag: { $regex: new RegExp(`^${String(data.tag).trim()}$`, "i") },
        isActive: true,
        id: { $ne: id },
      }).lean();
      if (dup) {
        return NextResponse.json(
          { success: false, error: `An active offer already uses the tag "${data.tag}"` },
          { status: 400 }
        );
      }
    }
    if (data.type === "category" && data.categoryId) {
      const dup = await Offer.findOne({
        type: "category",
        categoryId: data.categoryId,
        isActive: true,
        id: { $ne: id },
      }).lean();
      if (dup) {
        return NextResponse.json(
          { success: false, error: "An active offer already uses this category" },
          { status: 400 }
        );
      }
    }

    // Audit trail
    data.updatedBy = session?.user?.email || session?.user?.name || "owner";

    const offer = await Offer.findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: "after", runValidators: true }
    ).lean();

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete the old Cloudinary banner image if it was replaced.
    const oldIds = collectPublicIds(existing.bannerImage);
    const newIds = collectPublicIds(offer.bannerImage);
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

    return NextResponse.json({ success: true, data: offer, warnings });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update offer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    // Rate limit: 30 delete attempts per minute per IP
    const limited = await checkRateLimit({
      key: "admin-offers-delete",
      identifier: getClientIp(request),
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const { id } = await params;
    await connectToDatabase();

    const result = await Offer.findOneAndDelete({ id });

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Offer not found" },
        { status: 404 }
      );
    }

    // Cascade cleanup: delete the offer's Cloudinary banner image
    const publicIds = collectPublicIds(result.bannerImage);
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
      { success: false, error: getErrorMessage(err) || "Failed to delete offer" },
      { status: 500 }
    );
  }
}
