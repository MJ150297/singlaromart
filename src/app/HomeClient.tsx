"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown } from "lucide-react";
import { useAppSelector } from "@/store";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MegaMenu } from "@/components/MegaMenu";
import { SeasonalOffersCarousel } from "@/components/SeasonalOffersCarousel";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { getActiveOffers, getOfferProducts, OfferSection } from "@/lib/api/offers";
import { PagedResult } from "@/lib/catalog";
import { fetchApi } from "@/lib/swr";

type SortOption = "bestseller" | "percent_off" | "price_low" | "price_high";
const PAGE_SIZE = 24;

interface HomeClientProps {
  initialProducts: PagedResult;
  initialOfferSections: OfferSection[];
}

export default function HomeClient({
  initialProducts,
  initialOfferSections,
}: HomeClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("bestseller");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const cartItems = useAppSelector((state) => state.cart.items);

  const productsKey = `/products?sort=${sortBy}&page=${currentPage}&limit=${PAGE_SIZE}`;
  const { data: productsData, isLoading, error } = useSWR<PagedResult>(
    productsKey,
    (url) => fetchApi<PagedResult>(url),
    { fallbackData: initialProducts }
  );

  const { data: offers } = useSWR<OfferSection[]>("/offers/sections", async () => {
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
  }, { fallbackData: initialOfferSections });

  const products = productsData?.items ?? initialProducts?.items ?? [];
  const total = productsData?.total ?? initialProducts?.total ?? 0;
  const totalPages = productsData?.totalPages ?? initialProducts?.totalPages ?? 1;
  const offerSections = offers ?? initialOfferSections;

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      <DeliveryBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="container mx-auto px-4 pt-4 space-y-6">
        <HeroCarousel />
        <MegaMenu />
        <SeasonalOffersCarousel sections={offerSections} />

        <section id="product-grid" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-base md:text-lg">All Offerings</h3>
              <span className="text-xs text-slate-500">
                {isLoading ? "Loading..." : `${total} item${total !== 1 ? "s" : ""}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Sort by
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-8 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="bestseller">Best Sellers</option>
                  <option value="percent_off">Biggest Saving</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-center py-16 text-rose-500">
              Failed to load products. Please refresh the page.
            </p>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <ProductGrid products={filteredProducts} />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      </main>

      <MobileBottomNav />
      <CartFloatingBar onCheckout={() => setIsCheckoutOpen(true)} />
      <CartDrawer />
      {isCheckoutOpen && (
        <CheckoutModal onClose={() => setIsCheckoutOpen(false)} />
      )}
    </div>
  );
}