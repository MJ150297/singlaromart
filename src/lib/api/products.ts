import { Product, ProductQuery } from "../schemas";
import {
  queryProducts,
  getProduct as getProductById,
  getRelatedProducts as getRelatedById,
} from "../catalog";

export interface PagedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getProducts(query: ProductQuery = {}): Promise<PagedProducts> {
  const result = await queryProducts(query);
  return {
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  };
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return getProductById(id);
}

export async function getProductsByCategory(category: string, page = 1, limit = 24): Promise<PagedProducts> {
  return getProducts({ category, page, limit });
}

export async function getRelatedProducts(productId: string, limit = 6): Promise<Product[]> {
  return getRelatedById(productId, limit);
}