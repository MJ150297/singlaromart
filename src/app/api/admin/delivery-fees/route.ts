import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DeliveryFeeRule } from "@/lib/models/DeliveryFeeRule";
import { getErrorMessage } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DeliveryFeeRuleInputSchema } from "@/lib/pricing/deliveryRuleSchema";
import { ZodError } from "zod";

const VALID_STATUS = ["active", "inactive"] as const;
const VALID_FEE_TYPES = ["flat", "free_over_threshold"] as const;

function newRuleId(): string {
  return `dfr_${Date.now()}_${Buffer.from(randomBytes(3)).toString("hex")}`;
}

export async function GET(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const query: Record<string, unknown> = {};

    if (params.search && params.search.trim()) {
      query.name = { $regex: new RegExp(params.search.trim(), "i") };
    }
    if (params.status && VALID_STATUS.includes(params.status as (typeof VALID_STATUS)[number])) {
      query.isActive = params.status === "active";
    }
    if (params.feeType && VALID_FEE_TYPES.includes(params.feeType as (typeof VALID_FEE_TYPES)[number])) {
      query.feeType = params.feeType;
    }

    const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || "25", 10) || 25));

    const [total, items] = await Promise.all([
      DeliveryFeeRule.countDocuments(query),
      DeliveryFeeRule.find(query)
        .sort({ priority: -1, updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({ success: true, data: { items, total, page, limit } });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch delivery fee rules" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    const limited = await checkRateLimit({
      key: "admin-delivery-fees-create",
      identifier: getClientIp(request),
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const body = await request.json();
    const parsed = DeliveryFeeRuleInputSchema.parse(body);
    await connectToDatabase();

    const toDate = (value: string | null): Date | null =>
      value ? new Date(value) : null;

    const data = {
      id: newRuleId(),
      name: parsed.name,
      appliesTo: {
        productIds: parsed.appliesTo.productIds,
        subcategoryIds: parsed.appliesTo.subcategoryIds,
        categoryIds: parsed.appliesTo.categoryIds,
        allProducts: parsed.appliesTo.allProducts,
      },
      userEligibility: {
        userType: parsed.userEligibility.userType,
        minimumOrders: parsed.userEligibility.minimumOrders,
      },
      deliverySlots: parsed.deliverySlots,
      feeType: parsed.feeType,
      amount: parsed.amount,
      minOrderAmount: parsed.minOrderAmount,
      priority: parsed.priority,
      isActive: parsed.isActive,
      startsAt: toDate(parsed.startsAt),
      endsAt: toDate(parsed.endsAt),
      createdBy: session?.user?.email || session?.user?.name || "owner",
      updatedBy: session?.user?.email || session?.user?.name || "owner",
    };

    const rule = await DeliveryFeeRule.create(data);
    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to create delivery fee rule" },
      { status: 500 }
    );
  }
}