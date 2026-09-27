import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { RewardLedger } from "@/lib/models/RewardLedger";
import { User } from "@/lib/models/User";

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  await connectToDatabase();

  const users = await User.find({ creditBalance: { $gt: 0 } })
    .select("_id name email phone creditBalance")
    .sort({ creditBalance: -1, createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    success: true,
    data: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      creditBalance: user.creditBalance ?? 0,
    })),
  });
}
