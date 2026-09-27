import mongoose, { Schema, model, models } from "mongoose";

const CouponRedemptionSchema = new Schema(
  {
    couponId: { type: String, required: true, index: true },
    code: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    discountAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["reserved", "redeemed", "released", "reversed"], default: "reserved", index: true },
    redeemedAt: Date,
    releasedAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

CouponRedemptionSchema.index({ couponId: 1, userId: 1, status: 1 });

export const CouponRedemption = models.CouponRedemption || model("CouponRedemption", CouponRedemptionSchema);
export type CouponRedemptionDocument = mongoose.InferSchemaType<typeof CouponRedemptionSchema>;