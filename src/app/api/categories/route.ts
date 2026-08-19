import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  try {
    await connectToDatabase();
    const items = await Category.find().sort({ id: 1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
