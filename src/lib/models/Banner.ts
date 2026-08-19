import mongoose, { Schema, model, models } from "mongoose";

// ─── Banner schema ────────────────────────────────────────────────────────────
const BannerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: String,
    badge: String,
    gradient: String,
    cta: String,
    image: Schema.Types.Mixed,
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
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

export const Banner = models.Banner || model("Banner", BannerSchema);

export type BannerDocument = mongoose.InferSchemaType<typeof BannerSchema>;