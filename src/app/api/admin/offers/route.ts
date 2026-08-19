import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Offer } from "@/lib/models/Offer";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const items = await Offer.find().sort({ sortOrder: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch offers" },
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
      const count = await Offer.countDocuments();
      body.id = `offer-${String(count + 1).padStart(3, "0")}`;
    }

    const offer = await Offer.create(body);
    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create offer" },
      { status: 500 }
    );
  }
}
