import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Notification } from "@/lib/models/Notification";

/** Map a lean Notification doc to the API shape (id string + dates). */
function toApiNotification(doc: Record<string, unknown>) {
  const { _id, ...rest } = doc;
  delete rest.__v;
  return {
    ...rest,
    id: String(_id),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const parsed = parseInt(url.searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 50) : 20;

    await connectToDatabase();

    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: session.user.id, read: false }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map((item) => toApiNotification(item as Record<string, unknown>)),
        unreadCount,
      },
    });
  } catch (err: unknown) {
    console.error("Fetch notifications error:", err);
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/** Mark ALL of the current user's notifications as read. */
export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await Notification.updateMany(
      { userId: session.user.id, read: false },
      { $set: { read: true } }
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update notifications" },
      { status: 500 }
    );
  }
}
