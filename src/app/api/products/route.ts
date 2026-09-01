import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Product } from "@/lib/models/Product";
import { getErrorMessage } from "@/lib/errors";

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const subcategory = url.searchParams.get("subcategory");
    const subcategoryId = url.searchParams.get("subcategoryId");
    const search = url.searchParams.get("search");
    const sort = url.searchParams.get("sort");
    const inStock = url.searchParams.get("inStock");
    const tags = url.searchParams.get("tags");
    const ids = url.searchParams.get("ids");
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") || "24", 10), 1),
      100
    );

    // Build query. Each query parameter is an independent AND condition;
    // $or is used only for alternatives within a single parameter.
    const query: Record<string, unknown> = { isPublished: true };
    const andConditions: Record<string, unknown>[] = [];

    if (category && category !== "all") {
      const catLower = category.toLowerCase();
      andConditions.push({
        $or: [
          { categoryId: category },
          { category: { $regex: new RegExp(`^${catLower}$`, "i") } },
        ],
      });
    }
    if (subcategory) {
      andConditions.push({
        subcategories: { $regex: new RegExp(`^${subcategory}$`, "i") },
      });
    }
    if (subcategoryId) {
      andConditions.push({ subcategoryId });
    }
    if (search) {
      const q = search.toLowerCase();
      andConditions.push({
        $or: [
          { name: { $regex: new RegExp(q, "i") } },
          { tags: { $regex: new RegExp(q, "i") } },
          { description: { $regex: new RegExp(q, "i") } },
          { category: { $regex: new RegExp(q, "i") } },
        ],
      });
    }
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }
    if (inStock === "true") {
      query.inStock = true;
    }
    if (tags) {
      const tagList = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagList.length > 0) {
        // Match any of the requested tags (case-insensitive)
        query.tags = { $in: tagList.map((t) => new RegExp(`^${t}$`, "i")) };
      }
    }
    if (ids) {
      const idList = ids
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
      if (idList.length > 0) {
        query.id = { $in: idList };
      }
    }

    // Build sort
    let sortQuery: Record<string, 1 | -1> = {};
    switch (sort) {
      case "price_low":
        sortQuery = { price: 1 };
        break;
      case "price_high":
        sortQuery = { price: -1 };
        break;
      case "percent_off":
        sortQuery = { discountPercent: -1, price: 1 };
        break;
      case "bestseller":
        // Bestsellers first, then newest
        sortQuery = { createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
    }

    const total = await Product.countDocuments(query);
    const items = await Product.find(query)
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const hasMore = page < totalPages;

    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, hasMore, totalPages },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
