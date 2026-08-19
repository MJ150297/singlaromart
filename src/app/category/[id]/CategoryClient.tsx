"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PagedResult } from "@/lib/catalog";
import { useAppSelector } from "@/store";
import { Header } from "@/components/Header";
import { DeliveryBar } from "@/components/DeliveryBar";
import { ProductGrid } from "@/components/ProductGrid";
import { Pagination } from "@/components/Pagination";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { CartDrawer } from "@/components/CartDrawer";
import { CheckoutModal } from "@/components/CheckoutModal";
import { CategoryIcon } from "@/lib/categoryIcons";
import { Category } from "@/lib/api/categories";
import { fetchApi } from "@/lib/swr";

type SortOption = "bestseller" | "percent_off" | "price_low" | "price_high";
const PAGE_SIZE = 24;

interface CategoryClientProps {
  categoryId: string;
  initialProducts: PagedResult;
  initialCategories: Category[];
  initialCategory?: Category;
}

export default function CategoryClient({
  categoryId,
  initialProducts,
  initialCategories,
  initialCategory,
}: CategoryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedSub = searchParams.get("sub") || "";
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const cartItems = useAppSelector((state) => state.cart.items);

  // Categories from SWR (initialized with SSR data)
  const { data: categories } = useSWR<Category[]>("/categories", () =>
    fetchApi<Category[]>("/categories").then((arr) => arr ?? [])
  , { fallbackData: initialCategories });

  // Products key mirrors SSR URL
  const productsKey = `/products?category=${encodeURIComponent(categoryId)}${selectedSub ? `&subcategory=${encodeURIComponent(selectedSub)}` : ""}&sort=${sortBy}&page=${currentPage}&limit=${PAGE_SIZE}`;
  const { data: productsData, isLoading, error } = useSWR<PagedResult>(
    productsKey,
    (url) => fetchApi<PagedResult>(url),
    { fallbackData: initialProducts }
  );

  const catList = categories ?? initialCategories;
  const category = initialCategory || catList.find(
    (c) => c.id.toLowerCase() === categoryId.toLowerCase()
  );
  const products = productsData?.items ?? initialProducts?.items ?? [];
  const total = productsData?.total ?? initialProducts?.total ?? 0;
  const totalPages = productsData?.totalPages ?? initialProducts?.totalPages ?? 1;

  const updateUrl = useCallback(
    (updates: { sort?: SortOption; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.sort) params.set("sort", updates.sort);
      if (updates.page) params.set("page", String(updates.page));
      router.push(`/category/${categoryId}?${params.toString()}`, { scroll: false });
    },
    [router, categoryId, searchParams]
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

  const selectSubcategory = useCallback(
    (subName: string | null) => {
      if (subName) {
        router.push(
          `/category/${categoryId}?sub=${encodeURIComponent(subName)}&page=1`
        );
      } else {
        router.push(`/category/${categoryId}?page=1`);
      }
    },
    [router, categoryId]
  );

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Category not found
          </h1>
          <Link
            href="/"
            className="mt-4 inline-block text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

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
            {category.name}
          </span>
        </nav>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar - Subcategories */}
          <aside className="w-full md:w-56 shrink-0">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <ul className="space-y-1">
                {/* "ALL" subcategory item */}
                <li>
                  <button
                    onClick={() => selectSubcategory(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ${
                      !selectedSub
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#f9e0ea" }}
                    >
                      <CategoryIcon name={category.icon} className="w-5 h-5" />
                    </span>
                    <span>ALL</span>
                  </button>
                </li>

                {category.subcategories.map((sub) => {
                  const isActive = selectedSub === sub.name;
                  return (
                    <li key={sub.name}>
                      <button
                        onClick={() => selectSubcategory(sub.name)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                          isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                          style={{ backgroundColor: "#f0f0f0" }}
                        >
                          <CategoryIcon name={category.icon} className="w-5 h-5" />
                        </span>
                        <span>{sub.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* Right Main Area */}
          <div className="flex-1 min-w-0">
            {/* Header + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {category.name}
                </h1>
                <p className="text-sm text-slate-500">
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
            ) : (
              <>
                <ProductGrid
                  products={products}
                  gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
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