import { fetchJson } from "./client";
import { type CloudinaryImage } from "../schemas";

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image?: string | CloudinaryImage;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  try {
    const res = await fetchJson<ApiResponse<HeroSlide[]>>("/banners");
    return res.data ?? [];
  } catch (err) {
    console.error("Failed to fetch hero slides:", err);
    return [];
  }
}

