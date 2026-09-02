import mongoose, { Schema, model, models } from "mongoose";

// ─── Notification schema ─────────────────────────────────────────────────────
const NotificationSchema = new Schema(
  {
    // Recipient user id (customer account). Orders placed as guests have no
    // userId and therefore cannot receive in-app notifications.
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["order", "system"],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    // Deep link the user is taken to when they click the notification.
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: unknown, ret: Record<string, unknown>) => {
        const id = (ret.id as string) || String((_doc as { _id?: { toString(): string } })?._id ?? "");
        delete ret._id;
        delete ret.__v;
        ret.id = id;
        return ret;
      },
    },
  }
);

export const Notification = models.Notification || model("Notification", NotificationSchema);

export type NotificationDocument = mongoose.InferSchemaType<typeof NotificationSchema>;