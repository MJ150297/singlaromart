import mongoose, { Schema, model, models } from "mongoose";

// ─── Offer schema ─────────────────────────────────────────────────────────────
// A dynamic carousel section. Products are selected either by:
//   - type = "tag"      → all published products carrying `tag`
//   - type = "manual"   → explicit list of products in `productIds`
//   - type = "category" → all published products in `categoryId`
const OfferSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, index: true },
    description: String,
    type: {
      type: String,
      enum: ["tag", "manual", "category"],
      default: "tag",
      required: true,
    },
    // For type = "tag"
    tag: String,
    // For type = "manual"
    productIds: [String],
    // For type = "category"
    categoryId: String,
    // Optional banner image (string path/URL or Cloudinary object)
    bannerImage: Schema.Types.Mixed,
    // Scheduling window. Visible when now >= startsAt AND now <= endsAt.
    startsAt: { type: Date },
    endsAt: { type: Date },
    // Manual override — can force hide/show within the schedule window.
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
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

export const Offer = models.Offer || model("Offer", OfferSchema);

export type OfferDocument = mongoose.InferSchemaType<typeof OfferSchema>;