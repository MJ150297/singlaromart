import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createReferralCookieValue, REFERRAL_COOKIE, referralCookieOptions } from "@/lib/referrals";

const Schema = z.object({ code: z.string().trim().min(4).max(32) });

export async function POST(request: Request) {
  const limited = await checkRateLimit({ key: "referral-attribute", identifier: getClientIp(request), limit: 10, windowMs: 60_000 });
  if (limited) return NextResponse.json({ success: false, error: limited }, { status: 429 });
  const body = Schema.parse(await request.json());
  const response = NextResponse.json({ success: true });
  response.cookies.set(REFERRAL_COOKIE, createReferralCookieValue(body.code), referralCookieOptions());
  return response;
}