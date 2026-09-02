import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notification } from "@/lib/models/Notification";

/** Mark a single notification as read (owner-only). */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectToDatabase();
    const updated = await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { read: true } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Notification not found" }, { status: 404 });
    }

    const { _id, ...rest } = updated as Record<string, unknown>;
    delete rest.__v;
    return NextResponse.json({
      success: true,
      data: { ...rest, id: String(_id) },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update notification" },
      { status: 500 }
    );
  }
}
