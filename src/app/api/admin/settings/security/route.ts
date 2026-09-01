import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";
import { AdminPasswordUpdateSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/errors";

export async function PATCH(req: Request) {
  const { error, session } = await requireOwner();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = AdminPasswordUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid password" }, { status: 400 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ success: false, error: "New password must be different from the current password" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id).select("password tokenVersion");
    if (!user?.password || !(await bcrypt.compare(parsed.data.currentPassword, user.password))) {
      return NextResponse.json({ success: false, error: "Current password is incorrect" }, { status: 400 });
    }

    user.password = await bcrypt.hash(parsed.data.newPassword, 12);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    return NextResponse.json({ success: true, data: { requiresReauthentication: true } });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) || "Failed to update password" }, { status: 500 });
  }
}
