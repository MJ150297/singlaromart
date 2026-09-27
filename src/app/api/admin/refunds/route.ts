import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Refund } from "@/lib/models/Refund";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  return NextResponse.json({ success: true, data: await Refund.find().sort({ createdAt: -1 }).limit(100).lean() });
}