import { connectToDatabase } from "@/lib/db/mongoose";
import { DeliveryFeeRule } from "@/lib/models/DeliveryFeeRule";
import { DeliveryRuleInput } from "./deliveryFees";

/**
 * Server-side delivery-fee rule loading (DB access lives here, NOT in the
 * pure `resolveDeliveryFee` resolver so that resolver stays unit-testable).
 *
 * Currently loads the active set on every pricing call — revisit with caching
 * if checkout latency demands it.
 */
export async function loadActiveDeliveryFeeRules(): Promise<DeliveryRuleInput[]> {
  await connectToDatabase();
  const docs = await DeliveryFeeRule.find({ isActive: true }).lean();
  return docs.map((doc) => ({
    id: String(doc.id),
    appliesTo: {
      productIds: doc.appliesTo?.productIds ?? [],
      subcategoryIds: doc.appliesTo?.subcategoryIds ?? [],
      categoryIds: doc.appliesTo?.categoryIds ?? [],
      allProducts: doc.appliesTo?.allProducts === true,
    },
    userEligibility: {
      userType: doc.userEligibility?.userType ?? "all",
      minimumOrders: doc.userEligibility?.minimumOrders,
    },
    deliverySlots: doc.deliverySlots ?? [],
    feeType: doc.feeType,
    amount: Number(doc.amount ?? 0),
    minOrderAmount: doc.minOrderAmount !== undefined ? Number(doc.minOrderAmount) : undefined,
    priority: Number(doc.priority ?? 0),
    isActive: doc.isActive !== false,
    startsAt: doc.startsAt,
    endsAt: doc.endsAt,
  }));
}