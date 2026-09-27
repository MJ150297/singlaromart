import mongoose, { Schema, model, models } from "mongoose";

const ReferralProfileSchema = new Schema(
  { userId: { type: String, required: true, unique: true, index: true }, programId: { type: String, required: true }, referralCode: { type: String, required: true, unique: true, index: true } },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

export const ReferralProfile = models.ReferralProfile || model("ReferralProfile", ReferralProfileSchema);
export type ReferralProfileDocument = mongoose.InferSchemaType<typeof ReferralProfileSchema>;