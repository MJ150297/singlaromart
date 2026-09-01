import { connectToDatabase } from "@/lib/db/mongoose";
import { Category } from "@/lib/models/Category";
import ProductsClient from "./ProductsClient";

export default async function AdminProductsPage() {
  let initialCategories: Array<{ id: string; name: string; icon?: string; subcategories?: Array<{ id?: string; name: string; slug?: string; image?: string }> }> = [];

  try {
    await connectToDatabase();
    const categories = await Category.find().sort({ name: 1 }).lean();
    initialCategories = categories
      .filter((c) => c.id && c.id !== "all")
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        subcategories: c.subcategories || [],
      }));
  } catch {
    // Fall back to empty categories; client will fetch via SWR
  }

  return <ProductsClient initialCategories={initialCategories} initialProducts={null} />;
}