import { queryProducts } from "@/lib/catalog";
import { getActiveOffers, getOfferProducts, OfferSection } from "@/lib/api/offers";
import HomeClient from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch initial data server-side for SSR, in parallel.
  const productsPromise = queryProducts({
    sort: "bestseller",
    page: 1,
    limit: 24,
  });

  const offerSectionsPromise = (async (): Promise<OfferSection[]> => {
    try {
      const offers = await getActiveOffers();
      const sections = await Promise.all(
        offers.map(async (offer) => {
          const offerProducts = await getOfferProducts(offer.id);
          if (offerProducts.length === 0) return null;
          return {
            id: `offer-${offer.id}`,
            title: offer.name,
            description: offer.description,
            products: offerProducts,
            bannerImage: offer.bannerImage,
          } as OfferSection;
        })
      );
      return sections.filter((s): s is OfferSection => s !== null);
    } catch (err) {
      console.error("Failed to load offers:", err);
      return [];
    }
  })();

  const [initialProducts, initialOfferSections] = await Promise.all([
    productsPromise.catch(() => ({
      items: [],
      total: 0,
      page: 1,
      limit: 24,
      hasMore: false,
      totalPages: 1,
    })),
    offerSectionsPromise,
  ]);

  return (
    <HomeClient
      initialProducts={initialProducts}
      initialOfferSections={initialOfferSections}
    />
  );
}