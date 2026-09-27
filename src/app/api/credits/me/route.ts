import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { User } from "@/lib/models/User";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  await connectToDatabase();
  const [user, entries] = await Promise.all([User.findById(session.user.id).select("creditBalance").lean(), RewardLedger.find({ userId: session.user.id }).sort({ createdAt: -1 }).limit(50).lean()]);
  return NextResponse.json({ success: true, data: { balance: user?.creditBalance ?? 0, entries } });
}