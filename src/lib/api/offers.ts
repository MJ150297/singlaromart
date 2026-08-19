import { fetchJson } from "./client";
import { Product, type CloudinaryImage } from "../schemas";

export interface OfferSection {
  id: string;
  title: string;
  description?: string;
  products: Product[];
  bannerImage?: string | CloudinaryImage;
}

export interface Offer {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type: "tag" | "category" | "manual";
  tag?: string;
  categoryId?: string;
  productIds?: string[];
  bannerImage?: unknown;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const res = await fetchJson<ApiResponse<Offer[]>>("/offers");
    return res.data ?? [];
  } catch (err) {
    console.error("Failed to fetch offers:", err);
    return [];
  }
}

export async function getOfferProducts(offerId: string): Promise<Product[]> {
  try {
    const res = await fetchJson<ApiResponse<Product[]>>(
      `/offers/${encodeURIComponent(offerId)}/products`
    );
    return res.data ?? [];
  } catch (err) {
    console.error(`Failed to fetch products for offer ${offerId}:`, err);
    return [];
  }
}