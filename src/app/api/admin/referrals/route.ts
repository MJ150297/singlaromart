import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralProgram } from "@/lib/models/ReferralProgram";
import { ReferralReward } from "@/lib/models/ReferralReward";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();

  const [programs, attributions, rewards] = await Promise.all([
    ReferralProgram.find().sort({ createdAt: -1 }).lean(),
    ReferralAttribution.find().sort({ createdAt: -1 }).limit(100).lean(),
    ReferralReward.find().sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      programs,
      attributions,
      rewards,
    },
  });
}
