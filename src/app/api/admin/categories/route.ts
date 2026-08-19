import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const items = await Category.find().sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch categories" },
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

    if (!body.id) {
      const count = await Category.countDocuments();
      body.id = `cat-${String(count + 1).padStart(3, "0")}`;
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
            id: String(sub.id || "").trim() || `sub-${body.id}-${idx + 1}`,
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

    const category = await Category.create(body);
    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create category" },
      { status: 500 }
    );
  }
}