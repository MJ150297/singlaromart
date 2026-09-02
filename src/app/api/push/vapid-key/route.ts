import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json(
      { success: false, error: "Web Push is not configured on this server" },
      { status: 503 }
    );
  }
  return NextResponse.json({ success: true, data: { publicKey } });
}