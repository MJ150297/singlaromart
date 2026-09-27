import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/guard";
import { getErrorMessage } from "@/lib/errors";
import { resolveDeliveryFee, DeliveryRuleInput } from "@/lib/pricing/deliveryFees";
import { DeliveryFeeRuleInputSchema } from "@/lib/pricing/deliveryRuleSchema";
import { z, ZodError } from "zod";

/**
 * POST /api/admin/delivery-fees/preview
 * Dry-runs the supplied rule set against a sample cart so the owner can verify
 * precedence (fee vs product/category/global rules) before saving.
 */

const PreviewRequestSchema = z.object({
  rules: z.array(DeliveryFeeRuleInputSchema).default([]),
  cartTotal: z.number().min(0).max(1000000),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        categoryId: z.string().optional(),
        subcategoryId: z.string().optional(),
      })
    )
    .min(1)
    .max(200),
  deliverySlot: z.string().optional(),
  userType: z.enum(["all", "new", "existing"]).optional(),
  orderCount: z.number().int().min(0).max(10000).optional(),
  freeDeliveryCoupon: z.boolean().optional(),
});

function toRuleInput(rule: z.infer<typeof DeliveryFeeRuleInputSchema>): DeliveryRuleInput {
  return {
    id: rule.name.replace(/[^A-Za-z0-9_-]/g, "-").toLowerCase() + "-preview",
    appliesTo: {
      productIds: rule.appliesTo.productIds,
      subcategoryIds: rule.appliesTo.subcategoryIds,
      categoryIds: rule.appliesTo.categoryIds,
      allProducts: rule.appliesTo.allProducts,
    },
    userEligibility: {
      userType: rule.userEligibility.userType,
      minimumOrders: rule.userEligibility.minimumOrders || undefined,
    },
    deliverySlots: rule.deliverySlots,
    feeType: rule.feeType,
    amount: rule.amount,
    minOrderAmount: rule.minOrderAmount || undefined,
    priority: rule.priority,
    isActive: rule.isActive,
    startsAt: rule.startsAt,
    endsAt: rule.endsAt,
  };
}

export async function POST(request: Request) {
  const { error } = await requireOwner();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = PreviewRequestSchema.parse(body);

    const decision = resolveDeliveryFee(
      parsed.rules.map(toRuleInput),
      {
        lines: parsed.lines,
        cartTotal: parsed.cartTotal,
        deliverySlot: parsed.deliverySlot,
        isFirstOrderOfUser: parsed.userType === "new",
        orderCount: parsed.orderCount,
      },
      {
        freeDeliveryCouponApplied: parsed.freeDeliveryCoupon === true,
      }
    );

    return NextResponse.json({ success: true, data: decision });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: err.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: getErrorMessage(err) || "Failed to preview delivery fee" },
      { status: 500 }
    );
  }
}