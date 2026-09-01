import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/lib/models/Product";
import { getErrorMessage } from "@/lib/errors";

const VALID_SORT_FIELDS = ["createdAt", "name", "price", "stockQuantity", "updatedAt"];
const VALID_SORT_ORDERS = ["asc", "desc"];

// Whitelist of fields allowed on create/update to prevent injection of arbitrary data
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
  if (typeof data.name !== "string" || !data.name.trim()) return "Product name is required";
  if (typeof data.unit !== "string" || !data.unit.trim()) return "Unit is required";
  const numericFields = ["price", "originalPrice", "stockQuantity"] as const;
  for (const field of numericFields) {
    if (data[field] !== undefined && (!Number.isFinite(Number(data[field])) || Number(data[field]) < 0)) {
      return `${field} must be a non-negative number`;
    }
  }
  if (data.discountPercent !== undefined && (!Number.isFinite(Number(data.discountPercent)) || Number(data.discountPercent) < 0 || Number(data.discountPercent) > 100)) {
    return "Discount must be between 0 and 100";
  }
  if (Array.isArray(data.variants)) {
    for (const [index, variant] of data.variants.entries()) {
      if (!variant || typeof variant !== "object" || typeof (variant as Record<string, unknown>).unit !== "string" || !(variant as Record<string, unknown>).unit) return `Variant ${index + 1} needs a unit`;
      const item = variant as Record<string, unknown>;
      if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) return `Variant ${index + 1} needs a valid price`;
      if (item.discountPercent !== undefined && (!Number.isFinite(Number(item.discountPercent)) || Number(item.discountPercent) < 0 || Number(item.discountPercent) > 100)) return `Variant ${index + 1} discount must be between 0 and 100`;
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
    const sort = buildSort(params);
    const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));

    if (params.export === "csv") {
      const allProducts = await Product.find(query).sort(sort).lean();
      const csv = buildCsv(allProducts);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="products-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const [total, items] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    ]);

    const summary = await computeSummary(query);

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, summary },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch products" },
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

    // Validate required fields
    const errorMessage = validationError(data);
    if (errorMessage) return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });

    // Generate a unique id if not provided
    if (!data.id) {
      const count = await Product.countDocuments();
      data.id = `ind-${String(count + 1).padStart(3, "0")}`;
    }

    // Auto-generate slug from name if missing
    if (!data.slug || String(data.slug).trim() === "") {
      data.slug = slugify(String(data.name));
    }

    const product = await Product.create(data);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create product" },
      { status: 500 }
    );
  }
}

function buildQuery(params: Record<string, string>): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (params.search && params.search.trim()) {
    query.name = { $regex: new RegExp(params.search.trim(), "i") };
  }

  if (params.categoryId && params.categoryId !== "all") {
    query.categoryId = params.categoryId;
  }

  if (params.inStock && params.inStock !== "all") {
    query.inStock = params.inStock === "true";
  }

  if (params.isPublished && params.isPublished !== "all") {
    query.isPublished = params.isPublished === "true";
  }

  if (params.minPrice || params.maxPrice) {
    query.price = {};
    if (params.minPrice) {
      const min = Number(params.minPrice);
      if (!isNaN(min)) (query.price as Record<string, unknown>).$gte = min;
    }
    if (params.maxPrice) {
      const max = Number(params.maxPrice);
      if (!isNaN(max)) (query.price as Record<string, unknown>).$lte = max;
    }
    if (Object.keys(query.price as Record<string, unknown>).length === 0) {
      delete query.price;
    }
  }

  return query;
}

function buildSort(params: Record<string, string>): Record<string, 1 | -1> {
  const sortBy = params.sortBy && VALID_SORT_FIELDS.includes(params.sortBy) ? params.sortBy : "createdAt";
  const sortOrder = params.sortOrder && VALID_SORT_ORDERS.includes(params.sortOrder) ? params.sortOrder : "desc";
  return { [sortBy]: sortOrder === "asc" ? 1 : -1 };
}

async function computeSummary(query: Record<string, unknown>) {
  const [totalProducts, publishedCount, outOfStockCount, lowStockCount, totalValue] =
    await Promise.all([
      Product.countDocuments(query),
      Product.countDocuments({ ...query, isPublished: true }),
      Product.countDocuments({ ...query, inStock: false }),
      Product.countDocuments({ ...query, inStock: true, stockQuantity: { $lte: 5 } }),
      Product.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: { $multiply: ["$price", { $ifNull: ["$stockQuantity", 0] }] } } } },
      ]),
    ]);

  return {
    totalProducts,
    publishedCount,
    outOfStockCount,
    lowStockCount,
    totalValue: Math.round(totalValue[0]?.total || 0),
  };
}

function buildCsv(products: Array<Record<string, unknown>>): string {
  const headers = [
    "ID", "Name", "Slug", "Category", "Price", "Original Price", "Discount %",
    "Unit", "In Stock", "Stock Quantity", "Published", "Description",
    "Origin", "Badges", "Tags", "Created At", "Updated At",
  ];

  const rows = products.map((product: Record<string, unknown>) => {
    const badges = Array.isArray(product.badges) ? (product.badges as string[]).join("; ") : "";
    const tags = Array.isArray(product.tags) ? (product.tags as string[]).join("; ") : "";
    return [
      String(product.id || ""),
      String(product.name || ""),
      String(product.slug || ""),
      String(product.categoryId || product.category || ""),
      String(product.price ?? 0),
      String(product.originalPrice ?? ""),
      String(product.discountPercent ?? ""),
      String(product.unit || ""),
      String(product.inStock ? "Yes" : "No"),
      String(product.stockQuantity ?? 0),
      String(product.isPublished ? "Yes" : "No"),
      String(product.description || ""),
      String(product.origin || ""),
      badges,
      tags,
      product.createdAt ? new Date(product.createdAt as string).toISOString() : "",
      product.updatedAt ? new Date(product.updatedAt as string).toISOString() : "",
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
