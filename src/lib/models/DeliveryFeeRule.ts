import mongoose, { Schema, model, models } from "mongoose";

// ─── Delivery fee rule schema ────────────────────────────────────────────────
// Admin-managed, data-driven delivery fee configuration. The pricing engine
// resolves fees from these rules at checkout (see src/lib/pricing/deliveryFees.ts).
const DeliveryFeeRuleSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    // Scope — most specific match wins: product → subcategory → category → global
    appliesTo: {
      productIds: [String],
      subcategoryIds: [String],
      categoryIds: [String],
      allProducts: { type: Boolean, default: false },
    },
    // User dimension (e.g. "new users get free first delivery")
    userEligibility: {
      userType: {
        type: String,
        enum: ["all", "new", "existing"],
        default: "all",
      },
      // For "existing": user must have at least this many orders
      minimumOrders: Number,
    },
    // Empty = applies to all delivery slots
    deliverySlots: [String],
    feeType: {
      type: String,
      enum: ["flat", "free_over_threshold"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    // feeType = "free_over_threshold": order subtotal must reach this to match
    minOrderAmount: { type: Number, min: 0 },
    // Tie-breaker within the same scope breadth (higher wins)
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
    // Audit trail — set from the authenticated owner session
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

DeliveryFeeRuleSchema.index({ isActive: 1, priority: 1 });
DeliveryFeeRuleSchema.index({ "appliesTo.productIds": 1 });
DeliveryFeeRuleSchema.index({ "appliesTo.categoryIds": 1 });

export const DeliveryFeeRule =
  models.DeliveryFeeRule || model("DeliveryFeeRule", DeliveryFeeRuleSchema);

export type DeliveryFeeRuleDocument =
  mongoose.InferSchemaType<typeof DeliveryFeeRuleSchema>;