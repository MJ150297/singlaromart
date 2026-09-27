import mongoose, { Schema, model, models } from "mongoose";

const RefundSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    refundableAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    note: String,
    status: { type: String, enum: ["requested", "approved", "processed"], default: "requested", index: true },
    processedBy: String,
    refundedAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (_doc: unknown, ret: Record<string, unknown>) => { delete ret._id; delete ret.__v; return ret; } } }
);

export const Refund = models.Refund || model("Refund", RefundSchema);