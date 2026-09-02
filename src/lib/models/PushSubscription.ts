import mongoose, { Schema, model, models } from "mongoose";

// ─── Push subscription schema (Web Push) ─────────────────────────────────────
const PushSubscriptionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    // Unique push service endpoint provided by the browser.
    endpoint: { type: String, required: true, index: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: "" },
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

// One user can have multiple devices/browsers subscribed.
PushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

export const PushSubscription =
  models.PushSubscription || model("PushSubscription", PushSubscriptionSchema);

export type PushSubscriptionDocument = mongoose.InferSchemaType<typeof PushSubscriptionSchema>;