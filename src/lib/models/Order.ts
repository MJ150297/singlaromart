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

// ─── Order schema ─────────────────────────────────────────────────────────────
const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    // Optional link to a registered user (null for guest checkout)
    userId: { type: String, index: true },
    customer: { type: CustomerSchema, required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "confirmed", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
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