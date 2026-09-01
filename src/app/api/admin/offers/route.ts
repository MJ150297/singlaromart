import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Offer } from "@/lib/models/Offer";
import { getErrorMessage } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Whitelist of fields allowed on create/update to prevent injection of arbitrary data
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
  if (typeof data.name !== "string" || !data.name.trim()) {
    return "Offer name is required";
  }

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

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const query: Record<string, unknown> = {};

    if (params.search && params.search.trim()) {
      query.name = { $regex: new RegExp(params.search.trim(), "i") };
    }

    if (params.type && VALID_TYPES.includes(params.type as (typeof VALID_TYPES)[number])) {
      query.type = params.type;
    }

    // Status filter: active / scheduled / expired / inactive
    const now = new Date();
    if (params.status) {
      switch (params.status) {
        case "active":
          query.isActive = true;
          query.$and = [
            {
              $or: [
                { startsAt: { $lte: now } },
                { startsAt: null },
                { startsAt: { $exists: false } },
              ],
            },
            {
              $or: [
                { endsAt: { $gte: now } },
                { endsAt: null },
                { endsAt: { $exists: false } },
              ],
            },
          ];
          break;
        case "scheduled":
          query.isActive = true;
          query.startsAt = { $gt: now };
          break;
        case "expired":
          query.isActive = true;
          query.endsAt = { $lt: now };
          break;
        case "inactive":
          query.isActive = false;
          break;
      }
    }

    const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));

    // Sorting: whitelist fields to prevent injection
    const VALID_SORT_FIELDS = ["sortOrder", "name", "createdAt", "updatedAt"];
    const VALID_SORT_ORDERS = ["asc", "desc"];
    const sortBy = VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "sortOrder";
    const sortDir = VALID_SORT_ORDERS.includes(params.sortOrder) ? params.sortOrder : "asc";
    const sort: Record<string, 1 | -1> = { [sortBy]: sortDir === "asc" ? 1 : -1 };
    // Secondary sort for stable ordering
    if (sortBy !== "sortOrder") sort.sortOrder = 1;

    const [total, items] = await Promise.all([
      Offer.countDocuments(query),
      Offer.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch offers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    // Rate limit: 30 create attempts per minute per IP
    const limited = await checkRateLimit({
      key: "admin-offers-create",
      identifier: getClientIp(request),
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const body = await request.json();
    await connectToDatabase();

    const data = pickAllowed(body);

    const errorMessage = validationError(data);
    if (errorMessage) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    // Auto-generate slug from name if missing
    if (!data.slug || String(data.slug).trim() === "") {
      data.slug = slugify(String(data.name));
    }

    // Enforce slug uniqueness (case-insensitive)
    const slug = String(data.slug).toLowerCase();
    const existingSlug = await Offer.findOne({
      slug: { $regex: new RegExp(`^${slug}$`, "i") },
    }).lean();
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "An offer with this slug already exists" },
        { status: 400 }
      );
    }

    // Duplicate detection: reject if an active offer already uses the same tag/category
    if (data.type === "tag" && data.tag) {
      const dup = await Offer.findOne({
        type: "tag",
        tag: { $regex: new RegExp(`^${String(data.tag).trim()}$`, "i") },
        isActive: true,
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
      }).lean();
      if (dup) {
        return NextResponse.json(
          { success: false, error: "An active offer already uses this category" },
          { status: 400 }
        );
      }
    }

    if (!data.id) {
      const count = await Offer.countDocuments();
      data.id = `offer-${String(count + 1).padStart(3, "0")}`;
    }

    // Audit trail
    data.createdBy = session?.user?.email || session?.user?.name || "owner";
    data.updatedBy = session?.user?.email || session?.user?.name || "owner";

    const offer = await Offer.create(data);
    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create offer" },
      { status: 500 }
    );
  }
}
