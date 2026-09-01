import { NextResponse } from "next/server";
import { normalizeIndianMobile, sendOtp } from "@/lib/otp";

export async function POST(req: Request) {
  let body: { mobile?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const mobile = normalizeIndianMobile(body.mobile ?? "");
  if (!mobile) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid 10-digit mobile number" },
      { status: 400 }
    );
  }

  const result = await sendOtp({ mobile, req });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.message },
      { status: 429 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { mobile, expiresInMs: result.expiresInMs },
  });
}