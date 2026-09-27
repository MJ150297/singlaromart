import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Coupon } from "@/lib/models/Coupon";
import { CouponRedemption } from "@/lib/models/CouponRedemption";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const { id } = await params;
  const coupon = await Coupon.findOne({ id }).lean();
  if (!coupon) return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 });
  const redemptions = await CouponRedemption.find({ couponId: id }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ success: true, data: { coupon, redemptions } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireOwner();
  if (error) return error;
  const limited = await checkRateLimit({ key: "admin-coupons-update", identifier: getClientIp(request), limit: 60, windowMs: 60_000 });
  if (limited) return NextResponse.json({ success: false, error: limited }, { status: 429 });
  await connectToDatabase();
  const { id } = await params;
  const body = await request.json();
  const allowed = ["name", "description", "isActive", "startsAt", "endsAt", "usageLimit", "perUserLimit", "maximumDiscountAmount", "minimumOrderAmount", "eligibleUserType", "firstOrderOnly"];
  const update = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  update.updatedBy = session?.user?.email || "owner";
  const coupon = await Coupon.findOneAndUpdate({ id }, { $set: update, $inc: { version: 1 } }, { returnDocument: "after", runValidators: true }).lean();
  if (!coupon) return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: coupon });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireOwner();
  if (error) return error;
  const limited = await checkRateLimit({ key: "admin-coupons-delete", identifier: getClientIp(request), limit: 30, windowMs: 60_000 });
  if (limited) return NextResponse.json({ success: false, error: limited }, { status: 429 });
  await connectToDatabase();
  const { id } = await params;
  const coupon = await Coupon.findOneAndUpdate({ id }, { $set: { isActive: false, updatedBy: session?.user?.email || "owner" }, $inc: { version: 1 } }, { returnDocument: "after" }).lean();
  if (!coupon) return NextResponse.json({ success: false, error: "Coupon not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: coupon });
}