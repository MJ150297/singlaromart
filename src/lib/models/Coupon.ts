import mongoose, { Schema, model, models } from "mongoose";

const CouponSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: String,
    discountType: { type: String, enum: ["percentage", "fixed_amount"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maximumDiscountAmount: { type: Number, min: 0 },
    minimumOrderAmount: { type: Number, default: 0, min: 0 },
    startsAt: Date,
    endsAt: Date,
    isActive: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    eligibleUserType: { type: String, enum: ["all", "new", "existing"], default: "all" },
    eligibleProductIds: { type: [String], default: [] },
    eligibleCategoryIds: { type: [String], default: [] },
    eligibleSubcategoryIds: { type: [String], default: [] },
    excludedProductIds: { type: [String], default: [] },
    firstOrderOnly: { type: Boolean, default: false },
    stackingPolicy: { type: String, enum: ["single"], default: "single" },
    version: { type: Number, default: 1 },
    createdBy: String,
    updatedBy: String,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

CouponSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });

export const Coupon = models.Coupon || model("Coupon", CouponSchema);
export type CouponDocument = mongoose.InferSchemaType<typeof CouponSchema>;