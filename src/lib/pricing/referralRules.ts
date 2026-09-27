import { ReferralAttribution } from "@/lib/models/ReferralAttribution";
import { ReferralProgram } from "@/lib/models/ReferralProgram";
import { roundMoney } from "./money";
import type { PricingLine } from "./types";

export async function resolveReferralBenefit(userId: string | undefined, orderCount: number, lines: readonly PricingLine[], subtotal: number, now: Date) {
  if (!userId || orderCount > 0) return null;
  const attribution = await ReferralAttribution.findOne({ referredUserId: userId, fraudStatus: { $nin: ["blocked"] }, qualifiedAt: { $exists: false }, expiresAt: { $gte: now } }).lean();
  if (!attribution) return null;
  const program = await ReferralProgram.findOne({ id: attribution.programId, isActive: true }).lean();
  if (!program) return null;
  const eligible = program.benefitScope === "product"
    ? lines.filter((line) => (program.eligibleProductIds ?? []).includes(line.productId))
    : program.benefitScope === "category"
      ? lines.filter((line) => (program.eligibleCategoryIds ?? []).includes(line.categoryId || ""))
      : lines;
  if (eligible.length === 0) return null;
  return { programId: program.id, amount: roundMoney(Math.min(program.referredBenefitAmount, subtotal)) };
}