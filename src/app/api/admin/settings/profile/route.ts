import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { User } from "@/lib/models/User";
import { AdminProfileUpdateSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/errors";

export async function GET() {
  const { error, session } = await requireOwner();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id)
      .select("name email phone role")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) || "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { error, session } = await requireOwner();
  if (error) return error;
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = AdminProfileUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Invalid profile" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const email = parsed.data.email || undefined;
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: session.user.id } }).select("_id").lean();
      if (existing) {
        return NextResponse.json({ success: false, error: "Email already registered to another account" }, { status: 409 });
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      email ? { $set: { name: parsed.data.name, email, displayEmail: email } } : { $set: { name: parsed.data.name }, $unset: { email: 1, displayEmail: 1 } },
      { returnDocument: "after", runValidators: true },
    ).select("name email displayEmail phone role").lean();

    if (!user) {
      return NextResponse.json({ success: false, error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { name: user.name, email: user.email ?? null, phone: user.phone ?? null, role: user.role },
    });
  } catch (error: unknown) {
    return NextResponse.json({ success: false, error: getErrorMessage(error) || "Failed to update profile" }, { status: 500 });
  }
}
