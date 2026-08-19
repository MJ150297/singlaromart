import { Product } from "./schemas";
import { fetchJson } from "./api/client";

export interface PagedResult {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductQueryParams {
  category?: string;
  subcategory?: string;
  subcategoryId?: string;
  search?: string;
  sort?: "bestseller" | "price_low" | "price_high" | "percent_off";
  page?: number;
  limit?: number;
  inStock?: boolean;
  tags?: string[];
  ids?: string[];
}

export async function queryProducts(
  params: ProductQueryParams = {}
): Promise<PagedResult> {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.subcategory) searchParams.set("subcategory", params.subcategory);
  if (params.subcategoryId) searchParams.set("subcategoryId", params.subcategoryId);
  if (params.search) searchParams.set("search", params.search);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.inStock !== undefined)
    searchParams.set("inStock", String(params.inStock));
  if (params.tags && params.tags.length > 0)
    searchParams.set("tags", params.tags.join(","));
  if (params.ids && params.ids.length > 0)
    searchParams.set("ids", params.ids.join(","));

  const qs = searchParams.toString();
  const res = await fetchJson<ApiResponse<PagedResult>>(
    `/products${qs ? `?${qs}` : ""}`
  );
  return (
    res.data ?? { items: [], total: 0, page: 1, limit: 24, hasMore: false, totalPages: 1 }
  );
}

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetchJson<ApiResponse<PagedResult>>("/products?limit=100");
    return res.data?.items ?? [];
  } catch (err) {
    console.error("Failed to fetch products:", err);
    return [];
  }
}

export async function getProduct(id: string): Promise<Product | undefined> {
  try {
    const res = await fetchJson<ApiResponse<Product>>(`/products/${id}`);
    return res.data;
  } catch (err) {
    console.error(`Failed to fetch product ${id}:`, err);
    return undefined;
  }
}

export async function getProductsByCategory(
  category: string
): Promise<Product[]> {
  try {
    const res = await fetchJson<ApiResponse<PagedResult>>(
      `/products?category=${encodeURIComponent(category)}&limit=100`
    );
    return res.data?.items ?? [];
  } catch (err) {
    console.error(`Failed to fetch products for category ${category}:`, err);
    return [];
  }
}

export async function getRelatedProducts(
  productId: string,
  limit: number = 6
): Promise<Product[]> {
  // Fetch the product first to determine its category
  const product = await getProduct(productId);
  if (!product) return [];

  const category = product.categoryId || product.category;
  if (!category) return [];

  try {
    const res = await fetchJson<ApiResponse<PagedResult>>(
      `/products?category=${encodeURIComponent(category)}&limit=${limit}`
    );
    return (res.data?.items ?? []).filter((p) => p.id !== productId);
  } catch (err) {
    console.error("Failed to fetch related products:", err);
    return [];
  }
}