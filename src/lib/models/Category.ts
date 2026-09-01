import mongoose, { Schema, model, models } from "mongoose";

// ─── Subcategory sub-schema ───────────────────────────────────────────────────
const SubcategorySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, index: true },
    image: Schema.Types.Mixed,
  },
  { _id: false }
);

// ─── Category schema ──────────────────────────────────────────────────────────
const CategorySchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, index: true },
    description: String,
    icon: String,
    image: Schema.Types.Mixed,
    subcategories: [SubcategorySchema],
    parentId: { type: String, default: null, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    // SEO fields
    metaTitle: String,
    metaDescription: String,
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

// Text index for search
CategorySchema.index({ name: "text", slug: "text" });

export const Category =
  models.Category || model("Category", CategorySchema);

export type CategoryDocument = mongoose.InferSchemaType<typeof CategorySchema>;