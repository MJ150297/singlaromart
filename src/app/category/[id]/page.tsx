import { queryProducts } from "@/lib/catalog";
import { getCategories, Category } from "@/lib/api/categories";
import { PagedResult } from "@/lib/catalog";
import CategoryClient from "./CategoryClient";

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

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const selectedSub = typeof sp.sub === "string" ? sp.sub : "";
  const sortParam = typeof sp.sort === "string" ? (sp.sort as SortOption) : null;
  const sortBy: SortOption =
    sortParam && VALID_SORTS.includes(sortParam) ? sortParam : "bestseller";
  const pageParam = parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // Fetch initial data server-side for SSR, in parallel.
  const categoriesPromise = getCategories().catch(() => [] as Category[]);
  const productsPromise = queryProducts({
    category: id,
    subcategory: selectedSub || undefined,
    sort: sortBy,
    page: currentPage,
    limit: PAGE_SIZE,
  }).catch(() => EMPTY_PAGE);

  const [categories, initialProducts] = await Promise.all([
    categoriesPromise,
    productsPromise,
  ]);

  const initialCategory = categories.find(
    (c) => c.id.toLowerCase() === id.toLowerCase()
  );

  return (
    <CategoryClient
      categoryId={id}
      initialProducts={initialProducts}
      initialCategories={categories}
      initialCategory={initialCategory}
    />
  );
}