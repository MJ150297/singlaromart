import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";

const VALID_SORT_FIELDS = ["name", "createdAt", "updatedAt", "sortOrder", "productCount"];
const VALID_SORT_ORDERS = ["asc", "desc"];

// Whitelist of fields allowed on create to prevent injection of arbitrary data
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
  if (typeof data.name !== "string" || !data.name.trim()) return "Category name is required";
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

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const query = buildQuery(params);

    // Fetch categories and product counts in parallel
    const categories = await Category.find(query).lean();
    const products = await Product.find({}, { categoryId: 1, category: 1 }).lean();

    const countMap = new Map<string, number>();
    for (const p of products) {
      const key = p.categoryId || p.category || "";
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    const enriched = categories.map((c) => ({
      ...c,
      productCount: countMap.get(c.id) ?? countMap.get(c.name) ?? 0,
    }));

    // Server-side sorting (including by productCount)
    const sorted = sortEnriched(enriched, params);

    // CSV export
    if (params.export === "csv") {
      const csv = buildCsv(sorted);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="categories-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Paginated mode (page/limit params present)
    if (params.page || params.limit) {
      const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));
      const total = sorted.length;
      const items = sorted.slice((page - 1) * limit, page * limit);
      const summary = computeSummary(sorted);
      return NextResponse.json({ success: true, data: { items, total, page, limit, summary } });
    }

    // Legacy mode: plain array (backwards compat for products page)
    return NextResponse.json({ success: true, data: sorted });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
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

    // Auto-generate slug from name if missing
    if (!data.slug || String(data.slug).trim() === "") {
      data.slug = slugify(String(data.name));
    }

    // Enforce slug uniqueness
    const existingSlug = await Category.findOne({ slug: data.slug }).lean();
    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: "A category with this slug already exists" },
        { status: 409 }
      );
    }

    // Auto-generate id if missing
    if (!data.id || String(data.id).trim() === "") {
      const count = await Category.countDocuments();
      data.id = `cat-${String(count + 1).padStart(3, "0")}`;
    }

    const category = await Category.create(data);

    // Revalidate cached category data
    await revalidatePath("/");
    await revalidatePath("/api/categories");
    await revalidatePath("/api/admin/categories");

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(err) }, { status: 500 });
  }
}

function buildQuery(params: Record<string, string>): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.search && params.search.trim()) {
    const rx = new RegExp(params.search.trim(), "i");
    query.$or = [{ name: rx }, { slug: rx }];
  }

  if (params.isActive && params.isActive !== "all") {
    query.isActive = params.isActive === "true";
  }

  return query;
}

function sortEnriched(
  categories: Array<Record<string, unknown>>,
  params: Record<string, string>
): Array<Record<string, unknown>> {
  const sortBy = params.sortBy && VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "sortOrder";
  const sortOrder = params.sortOrder && VALID_SORT_ORDERS.includes(params.sortOrder) ? params.sortOrder : "asc";
  const dir = sortOrder === "asc" ? 1 : -1;

  return [...categories].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (aVal === undefined || aVal === null) aVal = sortBy === "productCount" ? 0 : "";
    if (bVal === undefined || bVal === null) bVal = sortBy === "productCount" ? 0 : "";
    if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}

function computeSummary(categories: Array<Record<string, unknown>>) {
  const totalCategories = categories.length;
  const activeCount = categories.filter((c) => c.isActive !== false).length;
  const totalSubcategories = categories.reduce((acc, c) => acc + (Array.isArray(c.subcategories) ? c.subcategories.length : 0), 0);
  const totalProducts = categories.reduce((acc, c) => acc + (typeof c.productCount === "number" ? c.productCount : 0), 0);
  return { totalCategories, activeCount, totalSubcategories, totalProducts };
}

function buildCsv(categories: Array<Record<string, unknown>>): string {
  const headers = [
    "ID", "Name", "Slug", "Icon", "Description", "Parent ID",
    "Sort Order", "Active", "Subcategories", "Product Count",
    "Created At", "Updated At",
  ];

  const rows = categories.map((c: Record<string, unknown>) => {
    const subs = Array.isArray(c.subcategories)
      ? (c.subcategories as Array<{ name?: string }>).map((s) => s.name || "").join("; ")
      : "";
    return [
      String(c.id || ""),
      String(c.name || ""),
      String(c.slug || ""),
      String(c.icon || ""),
      String(c.description || ""),
      String(c.parentId || ""),
      String(c.sortOrder ?? 0),
      String(c.isActive === false ? "No" : "Yes"),
      subs,
      String(c.productCount ?? 0),
      c.createdAt ? new Date(c.createdAt as string).toISOString() : "",
      c.updatedAt ? new Date(c.updatedAt as string).toISOString() : "",
    ];
  });

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