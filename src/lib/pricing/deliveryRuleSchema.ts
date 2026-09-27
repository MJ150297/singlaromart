import { z } from "zod";

/**
 * Delivery fee rule input validation, shared between the admin create/update
 * routes and the admin preview endpoint. Client-safe (no server imports).
 */

export const DELIVERY_SLOTS = [
  "Morning (8 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
] as const;

export const AppliesToSchema = z
  .object({
    productIds: z.array(z.string().min(1)).max(200),
    subcategoryIds: z.array(z.string().min(1)).max(100),
    categoryIds: z.array(z.string().min(1)).max(100),
    allProducts: z.boolean(),
  })
  .superRefine((val, ctx) => {
    const hasProduct = val.productIds.length > 0;
    const hasSub = val.subcategoryIds.length > 0;
    const hasCat = val.categoryIds.length > 0;
    if (val.allProducts && (hasProduct || hasSub || hasCat)) {
      ctx.addIssue({
        code: "custom",
        path: ["appliesTo"],
        message:
          "Choose either specific products/categories or 'All products', not both.",
      });
      return;
    }
    if (!val.allProducts && !hasProduct && !hasSub && !hasCat) {
      ctx.addIssue({
        code: "custom",
        path: ["appliesTo"],
        message:
          "Select at least one product, subcategory, category, or 'All products'.",
      });
    }
  });

export const UserEligibilitySchema = z.object({
  userType: z.enum(["all", "new", "existing"]),
  minimumOrders: z.number().int().min(1).max(1000).nullable(),
});

export const DeliveryFeeRuleInputSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    appliesTo: AppliesToSchema,
    userEligibility: UserEligibilitySchema.default({
      userType: "all",
      minimumOrders: null,
    }),
    deliverySlots: z.array(z.enum(DELIVERY_SLOTS)).max(3),
    feeType: z.enum(["flat", "free_over_threshold"]),
    amount: z.number().min(0, "Amount cannot be negative").max(100000),
    minOrderAmount: z.number().min(0).max(1000000).nullable().default(null),
    priority: z.number().int().min(0).max(1000).default(0),
    isActive: z.boolean().default(true),
    startsAt: z.string().nullable().default(null),
    endsAt: z.string().nullable().default(null),
  })
  .superRefine((val, ctx) => {
    if (
      val.feeType === "free_over_threshold" &&
      (val.minOrderAmount === null || val.minOrderAmount < 1)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["minOrderAmount"],
        message: "Free-over-threshold requires a minimum order amount.",
      });
    }
    if (val.feeType === "flat" && val.amount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount cannot be negative.",
      });
    }
    const start = val.startsAt ? new Date(val.startsAt).getTime() : null;
    const end = val.endsAt ? new Date(val.endsAt).getTime() : null;
    if (start !== null && Number.isNaN(start)) {
      ctx.addIssue({
        code: "custom",
        path: ["startsAt"],
        message: "Invalid start date.",
      });
    }
    if (end !== null && Number.isNaN(end)) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Invalid end date.",
      });
    }
    if (
      start !== null &&
      end !== null &&
      !Number.isNaN(start) &&
      !Number.isNaN(end) &&
      end < start
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export type DeliveryFeeRuleInput = z.infer<typeof DeliveryFeeRuleInputSchema>;