import mongoose, { Schema, model, models } from "mongoose";

const PromotionAuditEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    entityType: {
      type: String,
      enum: ["coupon", "delivery_rule", "referral", "credit", "refund", "order"],
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    actor: { type: String, required: true },
    actorRole: { type: String, default: "system" },
    summary: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending_review", "cleared", "blocked", "resolved"],
      default: "pending_review",
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
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

PromotionAuditEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const PromotionAuditEvent =
  models.PromotionAuditEvent || model("PromotionAuditEvent", PromotionAuditEventSchema);

export type PromotionAuditEventDocument = mongoose.InferSchemaType<typeof PromotionAuditEventSchema>;
