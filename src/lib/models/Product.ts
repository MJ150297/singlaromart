import mongoose, { Schema, model, models } from "mongoose";

// ─── Variant sub-schema ───────────────────────────────────────────────────────
const VariantSchema = new Schema(
  {
    unit: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    inStock: { type: Boolean, default: true },
    // Optional variant-specific image (string path/URL or Cloudinary object)
    image: Schema.Types.Mixed,
  },
  { _id: false }
);

// ─── Cloudinary image sub-schema ──────────────────────────────────────────────
const CloudinaryImageSchema = new Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    secureUrl: String,
    width: Number,
    height: Number,
    alt: String,
    transformations: {
      thumbnail: String,
      card: String,
      detail: String,
      zoom: String,
    },
  },
  { _id: false }
);

// ─── Product schema ───────────────────────────────────────────────────────────
const ProductSchema = new Schema(
  {
    // Legacy string id (e.g. "ind-001") kept for URL compatibility
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    slug: { type: String, index: true },
    category: { type: String, index: true },
    categoryId: { type: String, index: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },

    // Image: either a string path/URL or a structured Cloudinary object
    image: {
      type: Schema.Types.Mixed,
      required: true,
    },
    images: [Schema.Types.Mixed],

    inStock: { type: Boolean, default: true },
    description: String,
    origin: String,
    badges: [String],
    originalPrice: { type: Number, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100 },
    nutritionalInfo: [String],
    storageInfo: String,
    healthFact: String,
    variants: [VariantSchema],
    subcategories: [String],
    subcategoryId: { type: String, index: true },
    tags: [String],

    stockQuantity: { type: Number, min: 0, default: 0 },
    isPublished: { type: Boolean, default: true },

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

// Text index for search
ProductSchema.index({ name: "text", tags: "text", category: "text" });

export const Product =
  models.Product || model("Product", ProductSchema);

export type ProductDocument = mongoose.InferSchemaType<typeof ProductSchema>;