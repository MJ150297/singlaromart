import { Suspense } from "react";
import { queryProducts } from "@/lib/catalog";
import { PagedResult } from "@/lib/catalog";
import SearchClient from "./SearchClient";

type SortOption = "bestseller" | "percent_off" | "price_low" | "price_high";
const PAGE_SIZE = 24;

const VALID_SORTS: SortOption[] = ["bestseller", "percent_off", "price_low", "price_high"];
const EMPTY_PAGE: PagedResult = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  hasMore: false,
  totalPages: 1,
};

async function SearchPageContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const query = typeof sp.q === "string" ? sp.q : "";
  const sortParam = typeof sp.sort === "string" ? (sp.sort as SortOption) : null;
  const sortBy: SortOption =
    sortParam && VALID_SORTS.includes(sortParam) ? sortParam : "bestseller";
  const pageParam = parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  let initialProducts: PagedResult = EMPTY_PAGE;
  if (query) {
    initialProducts = await queryProducts({
      search: query,
      sort: sortBy,
      page: currentPage,
      limit: PAGE_SIZE,
    }).catch(() => EMPTY_PAGE);
  }

  return (
    <SearchClient initialQuery={query} initialProducts={initialProducts} />
  );
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SearchPageContent searchParams={searchParams} />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";