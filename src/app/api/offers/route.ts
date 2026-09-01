import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Offer } from "@/lib/models/Offer";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectToDatabase();

    const now = new Date();

    // Active AND within schedule window (or no window set).
    // Both startsAt and endsAt are optional; if either is unset, it is ignored.
    const items = await Offer.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startsAt: { $lte: now } },
            { startsAt: null },
            { startsAt: { $exists: false } },
          ],
        },
        {
          $or: [
            { endsAt: { $gte: now } },
            { endsAt: null },
            { endsAt: { $exists: false } },
          ],
        },
      ],
    })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      { success: true, data: items },
      {
        headers: {
          // Short cache to reduce DB load while keeping storefront fresh.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}