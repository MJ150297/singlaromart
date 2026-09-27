import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralReward } from "@/lib/models/ReferralReward";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const { id } = await params;

  const [attribution, rewards] = await Promise.all([
    ReferralAttribution.findOne({ _id: id }).lean(),
    ReferralReward.find({ attributionId: id }).sort({ createdAt: -1 }).lean(),
  ]);

  if (!attribution) {
    return NextResponse.json({ success: false, error: "Referral attribution not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { attribution, rewards } });
}
