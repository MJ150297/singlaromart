import mongoose, { Schema, model, models } from "mongoose";

// ─── Order item sub-schema ────────────────────────────────────────────────────
const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    variantId: String,
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    name: String,
    unit: String,
    image: Schema.Types.Mixed,
  },
  { _id: false }
);

// ─── Customer sub-schema ──────────────────────────────────────────────────────
const CustomerSchema = new Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    address: { type: String, required: true },
    landmark: String,
    deliverySlot: { type: String, required: true },
    paymentMethod: { type: String, required: true },
  },
  { _id: false }
);

// ─── Status history sub-schema (audit trail) ──────────────────────────────────
const StatusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: String },
    note: String,
  },
  { _id: false }
);

// ─── Pricing snapshot (immutable at order creation) ──────────────────────────
// Mirrors src/lib/pricing/types.ts PricingBreakdown. Never edited after the
// order is created so financial records survive later coupon/program changes.
const PricingSnapshotSchema = new Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    couponDiscount: { type: Number, required: true, min: 0 },
    referralDiscount: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, required: true, min: 0 },
    storeCreditApplied: { type: Number, required: true, min: 0 },
    totalBeforeCredits: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], required: true },
    taxInclusive: { type: Boolean, required: true },
  },
  { _id: false }
);

// ─── Applied promotion sub-schema ─────────────────────────────────────────────
const AppliedPromotionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["coupon", "referral_benefit", "store_credit"],
      required: true,
    },
    code: String,
    promotionId: String,
    amount: { type: Number, required: true, min: 0 },
    metadata: Schema.Types.Mixed,
  },
  { _id: false }
);

// ─── Order schema ─────────────────────────────────────────────────────────────
const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    // Optional link to a registered user (null for guest checkout)
    userId: { type: String, index: true },
    customer: { type: CustomerSchema, required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    // Immutable server-computed pricing snapshot (added Phase 1; legacy orders
    // may not have it yet — UI falls back to totalAmount).
    pricing: { type: PricingSnapshotSchema },
    appliedPromotions: { type: [AppliedPromotionSchema], default: [] },
    couponRedemptionIds: { type: [String], default: [] },
    creditLedgerEntryIds: { type: [String], default: [] },
    // Client-supplied idempotency key — duplicate order retries are detected
    // through the unique sparse index and replayed, not re-created.
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    // Payment tracking
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    // Admin internal notes
    internalNotes: { type: String, default: "" },
    // Delivery notes / instructions
    deliveryNotes: { type: String, default: "" },
    // Audit trail of status changes
    statusHistory: { type: [StatusHistorySchema], default: [] },
    estimatedDelivery: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
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

export const Order = models.Order || model("Order", OrderSchema);

export type OrderDocument = mongoose.InferSchemaType<typeof OrderSchema>;