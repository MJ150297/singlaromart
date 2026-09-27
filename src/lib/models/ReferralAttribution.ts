import mongoose, { Schema, model, models } from "mongoose";

const ReferralAttributionSchema = new Schema(
  {
    referrerProfileId: { type: String, required: true },
    referrerUserId: { type: String, required: true, index: true },
    referredUserId: { type: String, required: true, index: true },
    programId: { type: String, required: true, index: true },
    source: { type: String, enum: ["link", "code", "campaign"], default: "link" },
    attributedAt: { type: Date, default: Date.now },
    qualifiedAt: Date,
    orderId: String,
    fraudStatus: { type: String, enum: ["none", "flagged", "cleared", "blocked"], default: "none" },
    expiresAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

ReferralAttributionSchema.index({ referredUserId: 1, programId: 1 }, { unique: true });
export const ReferralAttribution = models.ReferralAttribution || model("ReferralAttribution", ReferralAttributionSchema);