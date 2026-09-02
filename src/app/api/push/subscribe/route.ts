import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db/mongoose";
import { PushSubscription } from "@/lib/models/PushSubscription";

const KEY_FIELDS = ["p256dh", "auth"] as const;

function isValidKeys(keys: unknown): keys is { p256dh: string; auth: string } {
  if (!keys || typeof keys !== "object") return false;
  const obj = keys as Record<string, unknown>;
  return KEY_FIELDS.every((field) => typeof obj[field] === "string" && (obj[field] as string).length > 0);
}

/** Current subscription state for the signed-in user. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const count = await PushSubscription.countDocuments({ userId: session.user.id });
    return NextResponse.json({ success: true, data: { subscribed: count > 0 } });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to read subscription" },
      { status: 500 }
    );
  }
}

/** Register a new push subscription (endpoint + keys) for the signed-in user. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint, keys, userAgent } = body;

    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "A valid push endpoint is required" },
        { status: 400 }
      );
    }
    if (!isValidKeys(keys)) {
      return NextResponse.json(
        { success: false, error: "Push subscription keys are invalid" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await PushSubscription.findOneAndUpdate(
      { userId: session.user.id, endpoint },
      {
        $set: {
          userId: session.user.id,
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent: typeof userAgent === "string" ? userAgent : "",
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to save push subscription" },
      { status: 500 }
    );
  }
}

/** Remove a push subscription for the signed-in user. */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint } = body;
    if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
      return NextResponse.json(
        { success: false, error: "A valid push endpoint is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await PushSubscription.deleteOne({ userId: session.user.id, endpoint });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to remove push subscription" },
      { status: 500 }
    );
  }
}