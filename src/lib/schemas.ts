import { z } from "zod";

// Variant interface for weight/unit options
export const VariantSchema = z.object({
  unit: z.string(),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  discountPercent: z.number().optional(),
  inStock: z.boolean().default(true),
  // Optional variant-specific image (string path/URL or Cloudinary object)
  image: z
    .union([
      z.string().url().or(z.string().startsWith("/")),
      z.lazy(() => CloudinaryImageSchema),
    ])
    .optional(),
});

export type Variant = z.infer<typeof VariantSchema>;

// Product Schema
export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Product name is required"),
  // SEO-friendly slug (e.g. "authentic-basmati-rice")
  slug: z.string().min(1).optional(),
  // Denormalized display name kept for compatibility; prefer `categoryId` in future
  category: z.string().optional(),
  // Normalized relationship to a category record
  categoryId: z.string().optional(),
  price: z.number().positive("Price must be greater than zero"),
  unit: z.string(),

  // Image support: accept either legacy strings (local paths/URLs) or a structured Cloudinary image
  image: z.union([
    z.string().url().or(z.string().startsWith("/")),
    z.lazy(() => CloudinaryImageSchema),
  ]),
  images: z.array(z.union([z.string().url().or(z.string().startsWith("/")), z.lazy(() => CloudinaryImageSchema)])).optional(),
  inStock: z.boolean().default(true),
  description: z.string().optional(),
  origin: z.string().optional(),
  badges: z.array(z.string()).optional(),
  originalPrice: z.number().positive().optional(),
  discountPercent: z.number().optional(),
  nutritionalInfo: z.array(z.string()).optional(),
  storageInfo: z.string().optional(),
  healthFact: z.string().optional(),
  variants: z.array(VariantSchema).optional(),
  subcategories: z.array(z.string()).optional(),
  subcategoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Inventory and publication
  stockQuantity: z.number().int().nonnegative().optional(),
  isPublished: z.boolean().default(true),

  // Timestamps (ISO strings)
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const CatalogSchema = z.array(ProductSchema);


// Customer Checkout Details Schema
export const CustomerDetailsSchema = z.object({
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  phoneNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"),
  address: z.string().min(10, "Please enter a detailed delivery address"),
  landmark: z.string().optional(),
  deliverySlot: z.enum([
    "Morning (8 AM - 12 PM)",
    "Afternoon (12 PM - 4 PM)",
    "Evening (4 PM - 8 PM)",
  ]),
  paymentMethod: z.enum(["Cash on Delivery", "UPI on Delivery"]),
});

export type CustomerDetails = z.infer<typeof CustomerDetailsSchema>;

export const AdminSignupSchema = z
  .object({
    name: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
  });

export type AdminSignupForm = z.infer<typeof AdminSignupSchema>;

// Cloudinary / structured image schema
export const CloudinaryImageSchema = z.object({
  publicId: z.string(),
  url: z.string().url(),
  secureUrl: z.string().url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  alt: z.string().optional(),
  transformations: z
    .object({
      thumbnail: z.string().url().optional(),
      card: z.string().url().optional(),
      detail: z.string().url().optional(),
      zoom: z.string().url().optional(),
    })
    .optional(),
});

export type CloudinaryImage = z.infer<typeof CloudinaryImageSchema>;

// Generic API response typing (TypeScript-only wrapper)
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Product query interface for server-side pagination/filtering
export const ProductQuerySchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  subcategoryId: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(["bestseller", "price_low", "price_high", "percent_off"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  inStock: z.boolean().optional(),
});

export type ProductQuery = z.infer<typeof ProductQuerySchema>;

export type Product = z.infer<typeof ProductSchema>;