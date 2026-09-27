import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { Coupon } from "@/lib/models/Coupon";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const CouponInputSchema = z.object({
  code: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.number().positive().max(100000),
  maximumDiscountAmount: z.number().positive().max(100000).optional(),
  minimumOrderAmount: z.number().min(0).max(100000).default(0),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().max(100).default(1),
  eligibleUserType: z.enum(["all", "new", "existing"]).default("all"),
  eligibleProductIds: z.array(z.string()).default([]),
  eligibleCategoryIds: z.array(z.string()).default([]),
  eligibleSubcategoryIds: z.array(z.string()).default([]),
  excludedProductIds: z.array(z.string()).default([]),
  firstOrderOnly: z.boolean().default(false),
});

function newId() { return `coupon_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`; }

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;
  await connectToDatabase();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
  const search = url.searchParams.get("search")?.trim();
  const query = search ? { $or: [{ code: new RegExp(search, "i") }, { name: new RegExp(search, "i") }] } : {};
  const [total, items] = await Promise.all([Coupon.countDocuments(query), Coupon.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean()]);
  return NextResponse.json({ success: true, data: { items, total, page, limit } });
}

export async function POST(request: Request) {
  const { error, session } = await requireOwner();
  if (error) return error;
  const limited = await checkRateLimit({ key: "admin-coupons-create", identifier: getClientIp(request), limit: 30, windowMs: 60_000 });
  if (limited) return NextResponse.json({ success: false, error: limited }, { status: 429 });
  try {
    const input = CouponInputSchema.parse(await request.json());
    if (input.discountType === "percentage" && input.discountValue > 100) return NextResponse.json({ success: false, error: "Percentage discount cannot exceed 100." }, { status: 400 });
    await connectToDatabase();
    const coupon = await Coupon.create({ ...input, id: newId(), code: input.code.toUpperCase(), stackingPolicy: "single", createdBy: session?.user?.email || "owner", updatedBy: session?.user?.email || "owner" });
    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: error.issues }, { status: 400 });
    return NextResponse.json({ success: false, error: "Unable to create coupon." }, { status: 400 });
  }
}