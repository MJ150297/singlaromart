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
    name: { type: String, required: true },
    icon: String,
    image: Schema.Types.Mixed,
    subcategories: [SubcategorySchema],
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

export const Category =
  models.Category || model("Category", CategorySchema);

export type CategoryDocument = mongoose.InferSchemaType<typeof CategorySchema>;