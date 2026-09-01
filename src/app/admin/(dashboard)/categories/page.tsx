import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import type { CloudinaryImage } from "@/lib/schemas";
import CategoriesClient from "./CategoriesClient";

export interface CategorySummary {
  totalCategories: number;
  activeCount: number;
  totalSubcategories: number;
  totalProducts: number;
}

// Raw lean shapes from Mongoose queries (image is Mixed → unknown)
interface LeanSubcategory {
  id?: string;
  name: string;
  slug?: string;
  image?: unknown;
}

interface LeanCategory {
  id: string;
  name: string;
  slug?: string;
  icon?: string;
  image?: unknown;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
  metaTitle?: string;
  metaDescription?: string;
  subcategories?: LeanSubcategory[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface LeanProductRef {
  categoryId?: string;
  category?: string;
}

// Serializable shapes matching the CategoriesClient props exactly
interface InitialSubcategory {
  id?: string;
  name: string;
  slug?: string;
  image?: string | CloudinaryImage;
}

interface InitialCategory {
  id: string;
  name: string;
  icon: string;
  image?: string | CloudinaryImage;
  subcategories?: InitialSubcategory[];
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export default async function AdminCategoriesPage() {
  let initialCategories: InitialCategory[] = [];
  let initialSummary: CategorySummary | null = null;

  try {
    await connectToDatabase();
    const [categories, products] = await Promise.all([
      Category.find().sort({ sortOrder: 1, name: 1 }).lean<LeanCategory[]>(),
      Product.find({}, { categoryId: 1, category: 1 }).lean<LeanProductRef[]>(),
    ]);

    const countMap = new Map<string, number>();
    for (const p of products) {
      const key = p.categoryId || p.category || "";
      countMap.set(key, (countMap.get(key) || 0) + 1);
    }

    // Convert Mongoose lean docs into plain serializable objects before
    // passing to the Client Component. Otherwise Next.js throws:
    // "Only plain objects can be passed to Client Components from Server Components."
    initialCategories = categories.map((c) => ({
      id: String(c.id),
      name: String(c.name || ""),
      slug: c.slug ? String(c.slug) : undefined,
      icon: c.icon ? String(c.icon) : "",
      image: (c.image ?? undefined) as string | CloudinaryImage | undefined,
      description: c.description ? String(c.description) : undefined,
      sortOrder: Number(c.sortOrder ?? 0),
      isActive: c.isActive !== false,
      parentId: c.parentId ? String(c.parentId) : null,
      subcategories: Array.isArray(c.subcategories)
        ? c.subcategories.map((s) => ({
            id: s.id ? String(s.id) : undefined,
            name: String(s.name || ""),
            slug: s.slug ? String(s.slug) : undefined,
            image: (s.image ?? undefined) as string | CloudinaryImage | undefined,
          }))
        : [],
      createdAt: c.createdAt ? String(c.createdAt) : undefined,
      updatedAt: c.updatedAt ? String(c.updatedAt) : undefined,
      productCount: countMap.get(String(c.id)) ?? countMap.get(String(c.name || "")) ?? 0,
    }));

    const totalSubcategories = initialCategories.reduce(
      (acc, c) => acc + (Array.isArray(c.subcategories) ? c.subcategories.length : 0),
      0
    );
    const totalProducts = initialCategories.reduce(
      (acc, c) => acc + (typeof c.productCount === "number" ? c.productCount : 0),
      0
    );

    initialSummary = {
      totalCategories: initialCategories.length,
      activeCount: initialCategories.filter((c) => c.isActive !== false).length,
      totalSubcategories,
      totalProducts,
    };
  } catch {
    // Fall back to empty; client will fetch via SWR
  }

  return <CategoriesClient initialCategories={initialCategories} initialSummary={initialSummary} />;
}
