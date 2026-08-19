import { fetchJson } from "./client";
import type { CloudinaryImage } from "../schemas";

export interface Subcategory {
  id?: string;
  name: string;
  slug?: string;
  image?: string | CloudinaryImage;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string | CloudinaryImage;
  subcategories: Subcategory[];
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetchJson<ApiResponse<Category[]>>("/categories");
    return res.data ?? [];
  } catch (err) {
    console.error("Failed to fetch categories:", err);
    return [];
  }
}