import mongoose, { Schema, model, models } from "mongoose";

const ReferralProgramSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    referredBenefitAmount: { type: Number, required: true, min: 0 },
    referrerRewardAmount: { type: Number, required: true, min: 0 },
    benefitScope: { type: String, enum: ["all", "product", "category"], default: "all" },
    eligibleProductIds: { type: [String], default: [] },
    eligibleCategoryIds: { type: [String], default: [] },
    expiresAfterDays: { type: Number, default: 90, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: Date,
    endsAt: Date,
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

export const ReferralProgram = models.ReferralProgram || model("ReferralProgram", ReferralProgramSchema);