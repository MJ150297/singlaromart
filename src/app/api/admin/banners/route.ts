import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import { getErrorMessage } from "@/lib/errors";

const VALID_SORT_FIELDS = ["order", "title", "createdAt", "updatedAt"];
const VALID_SORT_ORDERS = ["asc", "desc"];

// Whitelist of fields allowed on create to prevent injection of arbitrary data
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
  if (typeof data.title !== "string" || !data.title.trim()) return "Banner title is required";
  if (data.order !== undefined && (!Number.isFinite(Number(data.order)) || Number(data.order) < 0)) {
    return "Order must be a non-negative number";
  }
  if (data.isActive !== undefined && typeof data.isActive !== "boolean") {
    return "isActive must be a boolean";
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

    const query = buildQuery(params);
    const sort = buildSort(params);

    const banners = await Banner.find(query).sort(sort).lean();

    // CSV export
    if (params.export === "csv") {
      const csv = buildCsv(banners);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="banners-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Paginated mode (page/limit params present)
    if (params.page || params.limit) {
      const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));
      const total = banners.length;
      const items = banners.slice((page - 1) * limit, page * limit);
      const summary = computeSummary(banners);
      return NextResponse.json({ success: true, data: { items, total, page, limit, summary } });
    }

    // Legacy mode: plain array (backwards compat)
    return NextResponse.json({ success: true, data: banners });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch banners" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const body = await request.json();
    await connectToDatabase();

    const data = pickAllowed(body);
    const errorMessage = validationError(data);
    if (errorMessage) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    // Auto-generate id if missing
    if (!data.id || String(data.id).trim() === "") {
      const count = await Banner.countDocuments();
      data.id = `banner-${String(count + 1).padStart(3, "0")}`;
    }

    // Give banners without an explicit order a stable position after existing banners.
    if (data.order === undefined) {
      const last = await Banner.findOne().sort({ order: -1 }).select({ order: 1 }).lean();
      data.order = Number(last?.order ?? -1) + 1;
    } else {
      data.order = Number(data.order);
    }

    const banner = await Banner.create(data);

    // Revalidate cached pages
    await revalidatePath("/");
    await revalidatePath("/api/banners");
    await revalidatePath("/api/admin/banners");

    return NextResponse.json({ success: true, data: banner }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create banner" },
      { status: 500 }
    );
  }
}

function buildQuery(params: Record<string, string>): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.search && params.search.trim()) {
    const rx = new RegExp(params.search.trim(), "i");
    query.$or = [{ title: rx }, { subtitle: rx }, { badge: rx }];
  }

  if (params.isActive && params.isActive !== "all") {
    query.isActive = params.isActive === "true";
  }

  return query;
}

function buildSort(params: Record<string, string>): Record<string, 1 | -1> {
  const sortBy = params.sortBy && VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "order";
  const sortOrder = params.sortOrder && VALID_SORT_ORDERS.includes(params.sortOrder) ? params.sortOrder : "asc";
  const direction = sortOrder === "asc" ? 1 : -1;
  // Make equal display orders deterministic instead of letting MongoDB choose.
  return sortBy === "order"
    ? { order: direction, createdAt: 1 }
    : { [sortBy]: direction, order: 1 };
}

function computeSummary(banners: Array<{ isActive?: boolean }>) {
  const totalBanners = banners.length;
  const activeCount = banners.filter((b) => b.isActive !== false).length;
  return { totalBanners, activeCount };
}

function buildCsv(banners: Array<Record<string, unknown>>): string {
  const headers = [
    "ID", "Title", "Subtitle", "Badge", "Gradient", "CTA",
    "Order", "Active", "Created At", "Updated At",
  ];

  const rows = banners.map((b: Record<string, unknown>) => [
    String(b.id || ""),
    String(b.title || ""),
    String(b.subtitle || ""),
    String(b.badge || ""),
    String(b.gradient || ""),
    String(b.cta || ""),
    String(b.order ?? 0),
    String(b.isActive === false ? "No" : "Yes"),
    b.createdAt ? new Date(b.createdAt as string).toISOString() : "",
    b.updatedAt ? new Date(b.updatedAt as string).toISOString() : "",
  ]);

  const escapeCsv = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");
}
