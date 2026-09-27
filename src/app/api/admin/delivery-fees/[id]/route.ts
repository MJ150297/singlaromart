import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { DeliveryFeeRule } from "@/lib/models/DeliveryFeeRule";
import { getErrorMessage } from "@/lib/errors";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { DeliveryFeeRuleInputSchema } from "@/lib/pricing/deliveryRuleSchema";
import { ZodError } from "zod";

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const { id } = await params;
    await connectToDatabase();
    const rule = await DeliveryFeeRule.findOne({ id }).lean();
    if (!rule) {
      return NextResponse.json(
        { success: false, error: "Delivery fee rule not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: rule });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to fetch delivery fee rule" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    const limited = await checkRateLimit({
      key: "admin-delivery-fees-update",
      identifier: getClientIp(request),
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();
    // The client submits the full rule object (PATCH with whitelist semantics —
    // unparseable/unknown fields are rejected by the schema, not trusted).
    const parsed = DeliveryFeeRuleInputSchema.parse(body);
    await connectToDatabase();

    const update = {
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
      updatedBy: session?.user?.email || session?.user?.name || "owner",
    };

    const rule = await DeliveryFeeRule.findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after", runValidators: true }
    );
    if (!rule) {
      return NextResponse.json(
        { success: false, error: "Delivery fee rule not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: rule });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to update delivery fee rule" },
      { status: 500 }
    );
  }
}

/**
 * Soft delete: archives the rule (isActive=false). Rules are never hard-deleted
 * so pricing history and audit trails survive.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireOwner();
  if (error) return error;

  try {
    const limited = await checkRateLimit({
      key: "admin-delivery-fees-delete",
      identifier: getClientIp(request),
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) {
      return NextResponse.json({ success: false, error: limited }, { status: 429 });
    }

    const { id } = await params;
    await connectToDatabase();

    const rule = await DeliveryFeeRule.findOneAndUpdate(
      { id },
      {
        $set: {
          isActive: false,
          updatedBy: session?.user?.email || session?.user?.name || "owner",
        },
      },
      { returnDocument: "after", runValidators: true }
    );
    if (!rule) {
      return NextResponse.json(
        { success: false, error: "Delivery fee rule not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: rule });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to archive delivery fee rule" },
      { status: 500 }
    );
  }
}