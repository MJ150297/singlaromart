import mongoose, { Schema, model, models } from "mongoose";

const RewardLedgerSchema = new Schema(
  {
    entryId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    referralRewardId: String,
    orderId: String,
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, enum: ["referral_reward", "refund_restore", "manual_adjustment", "order_payment", "expiry", "reversal"], required: true },
    status: { type: String, enum: ["applied", "expired", "reversed"], default: "applied" },
    expiresAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

RewardLedgerSchema.index({ userId: 1, createdAt: -1 });
export const RewardLedger = models.RewardLedger || model("RewardLedger", RewardLedgerSchema);
export type RewardLedgerDocument = mongoose.InferSchemaType<typeof RewardLedgerSchema>;