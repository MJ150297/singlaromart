import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const items = await Banner.find().sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
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

    if (!body.id) {
      const count = await Banner.countDocuments();
      body.id = `banner-${String(count + 1).padStart(3, "0")}`;
    }

    const banner = await Banner.create(body);
    return NextResponse.json({ success: true, data: banner }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create banner" },
      { status: 500 }
    );
  }
}
