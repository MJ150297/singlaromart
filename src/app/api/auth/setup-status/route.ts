import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";

export async function GET() {
  try {
    await connectToDatabase();
    const owner = await User.findOne({ role: "owner" }).select("_id").lean();
    return NextResponse.json({
      success: true,
      data: { ownerExists: !!owner },
    });
  } catch (err: unknown) {
    console.error("Setup status error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to check setup status" },
      { status: 500 }
    );
  }
}