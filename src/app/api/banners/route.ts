import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  try {
    await connectToDatabase();
    const items = await Banner.find({ isActive: true }).sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
