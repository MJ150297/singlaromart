import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralReward } from "@/lib/models/ReferralReward";
import { User } from "@/lib/models/User";
import { ensureReferralProfile } from "@/lib/referrals";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  await connectToDatabase();
  const profile = await ensureReferralProfile(session.user.id);
  const [attributions, rewards, user] = await Promise.all([ReferralAttribution.find({ referrerUserId: session.user.id }).sort({ createdAt: -1 }).lean(), ReferralReward.find({ referrerUserId: session.user.id }).sort({ createdAt: -1 }).lean(), User.findById(session.user.id).select("creditBalance").lean()]);
  return NextResponse.json({ success: true, data: { code: profile?.referralCode ?? null, link: profile ? `/signup?ref=${profile.referralCode}` : null, attributions, rewards, creditBalance: user?.creditBalance ?? 0 } });
}