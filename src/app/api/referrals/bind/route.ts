import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { bindReferralCode, REFERRAL_COOKIE, readReferralCookieValue } from "@/lib/referrals";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const cookieStore = await cookies();
  const code = readReferralCookieValue(cookieStore.get(REFERRAL_COOKIE)?.value);
  if (code) await bindReferralCode(code, session.user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(REFERRAL_COOKIE);
  return response;
}