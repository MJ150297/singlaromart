import mongoose, { Schema, model, models } from "mongoose";

const ReferralRewardSchema = new Schema(
  {
    attributionId: { type: String, required: true, unique: true },
    referrerUserId: { type: String, required: true, index: true },
    referredUserId: { type: String, required: true },
    programId: { type: String, required: true },
    rewardAmount: { type: Number, required: true, min: 0 },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "awarded", "expired", "reversed"], default: "pending", index: true },
    awardedAt: Date,
    orderId: String,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

export const ReferralReward = models.ReferralReward || model("ReferralReward", ReferralRewardSchema);
export type ReferralRewardDocument = mongoose.InferSchemaType<typeof ReferralRewardSchema>;