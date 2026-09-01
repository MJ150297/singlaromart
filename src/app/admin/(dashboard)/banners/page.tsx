import { connectToDatabase } from "@/lib/db/mongoose";
import { Banner } from "@/lib/models/Banner";
import type { CloudinaryImage } from "@/lib/schemas";
import BannersClient from "./BannersClient";

// ─── Shared summary type ────────────────────────────────────────────────
export interface BannersSummary {
  totalBanners: number;
  activeCount: number;
}

// ─── Raw shapes from Mongoose queries (image is Mixed → unknown) ─────
interface LeanBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  gradient?: string;
  cta?: string;
  image?: unknown;
  order?: number;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ─── Serializable shapes matching the client props exactly ──────────────
export interface InitialBanner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image?: string | CloudinaryImage;
  order: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default async function AdminBannersPage() {
  let initialBanners: InitialBanner[] = [];
  let initialSummary: BannersSummary | null = null;

  try {
    await connectToDatabase();
    const banners = await Banner.find().sort({ order: 1, title: 1 }).lean<LeanBanner[]>();

    // Convert Mongoose lean docs into plain serializable objects before
    // passing to the Client Component. Otherwise Next.js throws:
    // "Only plain objects can be passed to Client Components from Server Components."
    initialBanners = banners.map((b) => ({
      id: String(b.id),
      title: String(b.title || ""),
      subtitle: b.subtitle ? String(b.subtitle) : "",
      badge: b.badge ? String(b.badge) : "",
      gradient: b.gradient ? String(b.gradient) : "from-emerald-500 to-teal-600",
      cta: b.cta ? String(b.cta) : "",
      image: (b.image ?? undefined) as string | CloudinaryImage | undefined,
      order: Number(b.order ?? 0),
      isActive: b.isActive !== false,
      createdAt: b.createdAt ? String(b.createdAt) : undefined,
      updatedAt: b.updatedAt ? String(b.updatedAt) : undefined,
    }));

    initialSummary = {
      totalBanners: initialBanners.length,
      activeCount: initialBanners.filter((b) => b.isActive !== false).length,
    };
  } catch {
    // Fall back to empty; client will fetch via SWR
  }

  return <BannersClient initialBanners={initialBanners} initialSummary={initialSummary} />;
}