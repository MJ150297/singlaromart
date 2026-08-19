"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PagedResult } from "@/lib/catalog";
import { useAppSelector } from "@/store";
import { DeliveryBar } from "@/components/DeliveryBar";
import { Header } from "@/components/Header";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { fetchApi } from "@/lib/swr";

type SortOption = "bestseller" | "percent_off" | "price_low" | "price_high";
const PAGE_SIZE = 24;

interface SearchClientProps {
  initialQuery: string;
  initialProducts: PagedResult;
}

export default function SearchClient({
  initialQuery,
  initialProducts,
}: SearchClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") as SortOption | null;
  const pageParam = parseInt(searchParams.get("page") || "1", 10);

  const [currentPage, setCurrentPage] = useState(
    isNaN(pageParam) || pageParam < 1 ? 1 : pageParam
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    sortParam && ["bestseller", "percent_off", "price_low", "price_high"].includes(sortParam)
      ? sortParam
      : "bestseller"
  );
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const cartItems = useAppSelector((state) => state.cart.items);

  const productsKey = `/products?search=${encodeURIComponent(query)}&sort=${sortBy}&page=${currentPage}&limit=${PAGE_SIZE}`;
  const { data: productsData, isLoading, error } = useSWR<PagedResult>(
    query ? productsKey : null,
    (url) => fetchApi<PagedResult>(url),
    { fallbackData: initialProducts }
  );

  const products = productsData?.items ?? initialProducts?.items ?? [];
  const total = productsData?.total ?? initialProducts?.total ?? 0;
  const totalPages = productsData?.totalPages ?? initialProducts?.totalPages ?? 1;

  const updateUrl = useCallback(
    (updates: { sort?: SortOption; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.sort) params.set("sort", updates.sort);
      if (updates.page) params.set("page", String(updates.page));
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
    updateUrl({ sort: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateUrl({ page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12 text-slate-900 dark:text-slate-100">
      <DeliveryBar />
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="container mx-auto px-4 pt-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <Link href="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            Search results
          </span>
        </nav>

        {/* Header + Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Search results for &ldquo;{query}&rdquo;
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {isLoading ? "Loading..." : `${total} result${total !== 1 ? "s" : ""} found`}
            </p>
          </div>

          {/* Sort Dropdown */}
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

        {/* Loading state */}
        {error ? (
          <p className="text-center py-16 text-rose-500">
            Failed to load products. Please try again.
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm mt-1">
              Try a different search term or{" "}
              <Link href="/" className="text-emerald-600 hover:underline font-semibold">
                browse all products
              </Link>
            </p>
          </div>
        ) : (
          <>
            <ProductGrid
              products={products}
              gridClass="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
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