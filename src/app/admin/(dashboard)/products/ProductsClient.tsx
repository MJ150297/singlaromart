"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Plus, Pencil, Trash2, Search, X, Loader2, ImagePlus,
  Download, RefreshCw, Filter, CheckSquare, Square, AlertTriangle,
  Package, Eye, EyeOff, AlertCircle, Boxes,
} from "lucide-react";
import { ImageUpload } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";
import type { CloudinaryImage } from "@/lib/schemas";

type ApiResponse<T> = { success: boolean; data: T; warnings?: string[]; error?: string };

interface VariantForm { unit: string; price: string; originalPrice: string; discountPercent: string; inStock: boolean; image?: string | CloudinaryImage }
interface Product {
  id: string; name: string; slug?: string; category?: string; categoryId?: string;
  price: number; originalPrice?: number; discountPercent?: number; unit: string;
  image?: string | CloudinaryImage; images?: Array<string | CloudinaryImage>;
  inStock?: boolean; stockQuantity?: number; isPublished?: boolean;
  description?: string; origin?: string; badges?: string[]; nutritionalInfo?: string[];
  storageInfo?: string; healthFact?: string;
  variants?: Array<{ unit: string; price: number; originalPrice?: number; discountPercent?: number; inStock?: boolean; image?: string | CloudinaryImage }>;
  subcategories?: string[]; subcategoryId?: string; tags?: string[];
  createdAt?: string; updatedAt?: string;
}

interface ProductForm {
  id?: string;
  name: string;
  category: string;
  categoryId: string;
  slug: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  unit: string;
  image: string | CloudinaryImage;
  images: Array<string | CloudinaryImage>;
  inStock: boolean;
  description: string;
  origin: string;
  badges: string;
  nutritionalInfo: string;
  storageInfo: string;
  healthFact: string;
  variants: VariantForm[];
  subcategoryIds: string[];
  tags: string;
  stockQuantity: string;
  isPublished: boolean;
}

interface CategoryOption { id: string; name: string; icon?: string; subcategories?: Array<{ id?: string; name: string; slug?: string; image?: string }>; }

interface Summary {
  totalProducts: number; publishedCount: number; outOfStockCount: number;
  lowStockCount: number; totalValue: number;
}
interface ProductsListResponse { items: Product[]; total: number; page: number; limit: number; summary?: Summary }

const PAGE_SIZES = [10, 25, 50, 100];

export default function ProductsClient({ initialCategories, initialProducts }: { initialCategories: CategoryOption[]; initialProducts: ProductsListResponse | null }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [inStockFilter, setInStockFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [debouncedSearch, categoryFilter, inStockFilter, publishedFilter, minPrice, maxPrice, sortBy, sortOrder, limit]);

  const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
  if (inStockFilter !== "all") params.set("inStock", inStockFilter);
  if (publishedFilter !== "all") params.set("isPublished", publishedFilter);
  if (minPrice) params.set("minPrice", minPrice);
  if (maxPrice) params.set("maxPrice", maxPrice);

  const productsKey = `/api/admin/products?${params.toString()}`;
  const { data, isLoading, error, mutate } = useSWR<ProductsListResponse | null>(
    productsKey,
    async (url) => {
      const res = await fetch(url);
      const d = (await res.json()) as ApiResponse<ProductsListResponse>;
      if (!d.success) throw new Error(d.error || "Failed to load products");
      return d.data ?? null;
    },
    { fallbackData: initialProducts, revalidateOnFocus: true }
  );

  const { data: categoriesData } = useSWR<CategoryOption[]>('/api/admin/categories', () => fetch('/api/admin/categories').then((r) => r.json()).then((d) => (d.success ? d.data : [])).then((arr) => arr.filter((c: CategoryOption) => c.id && c.id !== 'all')), { fallbackData: initialCategories });

  const products = data?.items ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const categories = categoriesData || [];
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const emptyVariant = (): VariantForm => ({ unit: "", price: "", originalPrice: "", discountPercent: "", inStock: true, image: "" });

  const emptyForm = (): ProductForm => ({
    name: "",
    category: "",
    categoryId: "",
    slug: "",
    price: "",
    originalPrice: "",
    discountPercent: "",
    unit: "",
    image: "",
    images: [] as Array<string | CloudinaryImage>,
    inStock: true,
    description: "",
    origin: "",
    badges: "",
    nutritionalInfo: "",
    storageInfo: "",
    healthFact: "",
    variants: [] as VariantForm[],
    subcategoryIds: [] as string[],
    tags: "",
    stockQuantity: "0",
    isPublished: true,
  });
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [warning, setWarning] = useState("");

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function imageUrl(img?: string | { url?: string; secureUrl?: string; transformations?: { card?: string; thumbnail?: string } }): string {
    if (!img) return "";
    if (typeof img === "string") return img;
    return img.secureUrl || img.url || img.transformations?.card || img.transformations?.thumbnail || "";
  }

  function splitList(value: string): string[] {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }

  function joinList(values?: string[]): string {
    return values?.filter(Boolean).join(", ") || "";
  }

  function splitLines(value: string): string[] {
    return value.split("\n").map((s) => s.trim()).filter(Boolean);
  }

  function joinLines(values?: string[]): string {
    return values?.filter(Boolean).join("\n") || "";
  }

  function numOrUndefined(value: string): number | undefined {
    const n = Number(value);
    return value.trim() !== "" && !isNaN(n) ? n : undefined;
  }

  function patchForm(patch: Partial<ProductForm>) {
    setForm((prev: ProductForm) => ({ ...prev, ...patch }));
  }

  const showToast = useCallback((type: "success" | "error", message: string) => {
    toast[type](message);
  }, [toast]);

  const clearFilters = () => {
    setSearch(""); setCategoryFilter("all"); setInStockFilter("all");
    setPublishedFilter("all"); setMinPrice(""); setMaxPrice("");
    setSortBy("createdAt"); setSortOrder("desc"); setPage(1);
  };

  const hasActiveFilters = debouncedSearch || categoryFilter !== "all" || inStockFilter !== "all" ||
    publishedFilter !== "all" || minPrice || maxPrice;

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;
  const formatDate = (dateStr?: string) => dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Products", value: summary.totalProducts, icon: Package, color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
      { label: "Published", value: summary.publishedCount, icon: Eye, color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" },
      { label: "Out of Stock", value: summary.outOfStockCount, icon: AlertCircle, color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400" },
      { label: "Low Stock (≤5)", value: summary.lowStockCount, icon: Boxes, color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" },
    ];
  }, [summary]);

  const inputClass = "w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  // ─── Form helpers ───────────────────────────────────────────────────────────
  function openCreateForm() {
    setEditingProduct(null);
    setForm(emptyForm());
    setShowForm(true);
    setFormError("");
  }

  function openEditForm(product: Product) {
    const rawCat = product.categoryId || product.category || "";
    let catValue = rawCat;
    if (rawCat) {
      const found = categories.find((c) => c.id === rawCat) || categories.find((c) => c.name === rawCat);
      if (found) catValue = found.id;
    }

    setEditingProduct(product);
    setForm({
      id: product.id,
      name: product.name,
      category: catValue,
      categoryId: catValue,
      slug: product.slug || "",
      price: String(product.price ?? ""),
      originalPrice: product.originalPrice != null ? String(product.originalPrice) : "",
      discountPercent: product.discountPercent != null ? String(product.discountPercent) : "",
      unit: product.unit || "",
      image: product.image ?? "",
      images: product.images || [],
      inStock: product.inStock ?? true,
      description: product.description || "",
      origin: product.origin || "",
      badges: joinList(product.badges),
      nutritionalInfo: joinLines(product.nutritionalInfo),
      storageInfo: product.storageInfo || "",
      healthFact: product.healthFact || "",
      variants: (product.variants || []).map((v) => ({ unit: v.unit, price: String(v.price ?? ""), originalPrice: v.originalPrice != null ? String(v.originalPrice) : "", discountPercent: v.discountPercent != null ? String(v.discountPercent) : "", inStock: v.inStock ?? true, image: v.image ?? "" })),
      subcategoryIds: product.subcategoryId ? [product.subcategoryId] : [],
      tags: joinList(product.tags),
      stockQuantity: String(product.stockQuantity ?? 0),
      isPublished: product.isPublished ?? true,
    });
    setShowForm(true);
    setFormError("");
  }

  function addVariant() { patchForm({ variants: [...form.variants, emptyVariant()] }); }
  function updateVariant(index: number, patch: Partial<VariantForm>) { patchForm({ variants: form.variants.map((v: VariantForm, i: number) => (i === index ? { ...v, ...patch } : v)) }); }
  function removeVariant(index: number) { patchForm({ variants: form.variants.filter((_: VariantForm, i: number) => i !== index) }); }

  function addImage() { patchForm({ images: [...form.images, ""] }); }
  function updateImage(index: number, value: string | CloudinaryImage) { patchForm({ images: form.images.map((img: string | CloudinaryImage, i: number) => (i === index ? value : img)) }); }
  function removeImage(index: number) { patchForm({ images: form.images.filter((_: string | CloudinaryImage, i: number) => i !== index) }); }

  const selectedCategory = categories.find((c) => c.id === form.category);
  const availableSubcategories = selectedCategory?.subcategories || [];

  function toggleSubcategory(id: string) {
    patchForm({ subcategoryIds: form.subcategoryIds.includes(id) ? form.subcategoryIds.filter((s: string) => s !== id) : [...form.subcategoryIds, id] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    // Client-side validation
    if (!form.name.trim()) { setFormError("Product name is required"); setSaving(false); return; }
    if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) < 0) { setFormError("A valid price is required"); setSaving(false); return; }
    if (!form.unit.trim()) { setFormError("Unit is required"); setSaving(false); return; }
    const price = Number(form.price);
    const originalPrice = form.originalPrice.trim() ? Number(form.originalPrice) : undefined;
    const discountPercent = form.discountPercent.trim() ? Number(form.discountPercent) : undefined;
    const stockQuantity = form.stockQuantity.trim() ? Number(form.stockQuantity) : 0;
    if (!Number.isFinite(price) || price < 0) { setFormError("Price must be a non-negative number"); setSaving(false); return; }
    if (originalPrice !== undefined && (!Number.isFinite(originalPrice) || originalPrice < 0)) { setFormError("Original price must be a non-negative number"); setSaving(false); return; }
    if (discountPercent !== undefined && (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)) { setFormError("Discount must be between 0 and 100"); setSaving(false); return; }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) { setFormError("Stock quantity must be a non-negative number"); setSaving(false); return; }
    for (const [index, variant] of form.variants.entries()) {
      if (!variant.unit.trim()) { setFormError(`Variant ${index + 1} needs a unit`); setSaving(false); return; }
      const variantPrice = Number(variant.price);
      const variantDiscount = variant.discountPercent.trim() ? Number(variant.discountPercent) : undefined;
      if (!Number.isFinite(variantPrice) || variantPrice < 0) { setFormError(`Variant ${index + 1} needs a valid price`); setSaving(false); return; }
      if (variantDiscount !== undefined && (!Number.isFinite(variantDiscount) || variantDiscount < 0 || variantDiscount > 100)) { setFormError(`Variant ${index + 1} discount must be between 0 and 100`); setSaving(false); return; }
    }

    const payload = {
      ...form,
      price,
      originalPrice: numOrUndefined(form.originalPrice),
      discountPercent: numOrUndefined(form.discountPercent),
      stockQuantity,
      badges: splitList(form.badges),
      tags: splitList(form.tags),
      subcategories: form.subcategoryIds
        .map((id: string) => {
          const cat = categories.find((c) => c.id === form.category);
          const sub = cat?.subcategories?.find((s) => s.id === id);
          return sub?.name || "";
        })
        .filter(Boolean),
      subcategoryId: form.subcategoryIds[0] || undefined,
      nutritionalInfo: splitLines(form.nutritionalInfo),
      images: form.images.filter(Boolean),
      slug: form.slug.trim() || undefined,
      origin: form.origin.trim() || undefined,
      storageInfo: form.storageInfo.trim() || undefined,
      healthFact: form.healthFact.trim() || undefined,
      description: form.description.trim() || undefined,
      variants: form.variants
        .filter((v: VariantForm) => v.unit.trim() !== "")
        .map((v: VariantForm) => ({ unit: v.unit.trim(), price: numOrUndefined(v.price) ?? 0, originalPrice: numOrUndefined(v.originalPrice), discountPercent: numOrUndefined(v.discountPercent), inStock: v.inStock, image: v.image || undefined })),
    };

    try {
      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || "Failed to save product");
        setSaving(false);
        return;
      }

      if (data.warnings?.length) setWarning(data.warnings.join(" "));
      else setWarning("");

      setShowForm(false);
      showToast("success", editingProduct ? "Product updated successfully" : "Product created successfully");
      await mutate();
    } catch (err) {
      console.error(err);
      setFormError("Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(ids: string[], label: string) {
    setDeleteTarget({ ids, label });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ids = deleteTarget.ids;
    setDeleteTarget(null);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
        const data = await res.json();
        return { ok: res.ok && data.success, warning: data.warnings?.join(" "), error: data.error };
      }));
      const failed = results.filter((result) => !result.ok);
      const warnings = results.map((result) => result.warning).filter(Boolean);
      if (failed.length === 0) {
        showToast(warnings.length ? "error" : "success", warnings.join(" ") || `${ids.length} product${ids.length === 1 ? "" : "s"} deleted`);
        setSelected((prev) => prev.filter((s) => !ids.includes(s)));
        await mutate();
      } else showToast("error", failed[0].error || `Failed to delete ${failed.length} product${failed.length === 1 ? "" : "s"}`);
    } catch (err) { console.error(err); showToast("error", "Failed to delete product"); }
  }

  async function handleQuickToggle(id: string, field: "isPublished" | "inStock", value: boolean) {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", field === "isPublished" ? (value ? "Product published" : "Product unpublished") : (value ? "Marked in stock" : "Marked out of stock"));
        await mutate();
      } else {
        showToast("error", data.error || "Failed to update product");
      }
    } catch { showToast("error", "Failed to update product"); }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === products.length && products.length > 0) setSelected([]);
    else setSelected(products.map((p) => p.id));
  };

  async function handleBulkAction() {
    if (!bulkAction || selected.length === 0) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        requestDelete(selected, `${selected.length} selected product${selected.length === 1 ? "" : "s"}`);
        setBulkAction("");
      } else {
        const value = bulkAction === "publish" ? true : bulkAction === "unpublish" ? false : null;
        if (value === null) { setBulkLoading(false); return; }
        const results = await Promise.all(selected.map((id) =>
          fetch(`/api/admin/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: value }) })
        ));
        if (results.every((r) => r.ok)) {
          showToast("success", `Updated ${selected.length} product(s)`);
          setSelected([]); setBulkAction(""); await mutate();
        } else showToast("error", "Some products failed to update");
      }
    } catch { showToast("error", "Failed to perform bulk action"); }
    finally { setBulkLoading(false); }
  }

  async function handleExportCsv() {
    try {
      const res = await fetch(`/api/admin/products?${params.toString()}&export=csv`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); window.URL.revokeObjectURL(url);
      showToast("success", "CSV exported successfully");
    } catch { showToast("error", "Failed to export CSV"); }
  }

  function categoryName(product: Product): string {
    const cat = product.categoryId || product.category || "";
    if (!cat) return "-";
    const found = categories.find((c) => c.id === cat);
    return found ? found.name : cat;
  }

  const categoryOptions = categories.some((c) => c.id === form.category) ? categories : form.category ? [...categories, { id: form.category, name: form.category }] : categories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => mutate()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className={`${inputClass} pl-9`} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${hasActiveFilters ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Filter className="w-4 h-4" /> Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
                <option value="all">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Stock Status</label>
              <select value={inStockFilter} onChange={(e) => setInStockFilter(e.target.value)} className={selectClass}>
                <option value="all">All Stock</option>
                <option value="true">In Stock</option>
                <option value="false">Out of Stock</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Published</label>
              <select value={publishedFilter} onChange={(e) => setPublishedFilter(e.target.value)} className={selectClass}>
                <option value="all">All</option>
                <option value="true">Published</option>
                <option value="false">Unpublished</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                <option value="createdAt">Date Created</option>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="stockQuantity">Stock</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort Order</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={selectClass}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Min ₹</label>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Max ₹</label>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="∞" className={inputClass} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{selected.length} selected</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Bulk actions...</option>
            <option value="publish">Publish</option>
            <option value="unpublish">Unpublish</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={handleBulkAction} disabled={!bulkAction || bulkLoading} className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1">
            {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Apply
          </button>
          <button onClick={() => setSelected([])} className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancel</button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error instanceof Error ? error.message : "Failed to load products"}</p>
          <button onClick={() => mutate()} className="mt-3 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">{hasActiveFilters ? "Try adjusting your filters" : "Use the button above to add your first product"}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors">Clear Filters</button>
          )}
        </div>
      )}

      {/* Products Table (Desktop) */}
      {!isLoading && !error && products.length > 0 && (
        <>
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-emerald-600">
                      {selected.length === products.length && products.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Price</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Stock</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(product.id)} className="text-slate-400 hover:text-emerald-600">
                        {selected.includes(product.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {imageUrl(product.image) ? (
                          <div className="w-10 h-10 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                            <img src={imageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0">{product.unit}</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{categoryName(product)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(product.price)}</p>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <p className="text-xs text-slate-400 line-through">{formatCurrency(product.originalPrice)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${product.inStock ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"}`}>
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Qty: {product.stockQuantity ?? 0}</p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleQuickToggle(product.id, "isPublished", !product.isPublished)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${product.isPublished ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                        title={product.isPublished ? "Click to unpublish" : "Click to publish"}
                      >
                        {product.isPublished ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(product.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleQuickToggle(product.id, "inStock", !product.inStock)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title={product.inStock ? "Mark out of stock" : "Mark in stock"}>
                          {product.inStock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEditForm(product)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title="Edit product">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => requestDelete([product.id], product.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors" title="Delete product">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Products Cards (Mobile) */}
          <div className="md:hidden space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {imageUrl(product.image) ? (
                      <div className="w-12 h-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img src={imageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 shrink-0">{product.unit}</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                      <p className="text-xs text-slate-500">{categoryName(product)} · {formatCurrency(product.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${product.inStock ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400"}`}>
                      {product.inStock ? "In Stock" : "Out"}
                    </span>
                    <button onClick={() => toggleSelect(product.id)} className="text-slate-400">
                      {selected.includes(product.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${product.isPublished ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                      {product.isPublished ? "Published" : "Draft"}
                    </span>
                    <span className="text-[10px] text-slate-400">Qty: {product.stockQuantity ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleQuickToggle(product.id, "inStock", !product.inStock)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title={product.inStock ? "Mark out of stock" : "Mark in stock"}>
                      {product.inStock ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditForm(product)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Edit product">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => requestDelete([product.id], product.name)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete product">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} products</p>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="px-2 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
              </select>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingProduct ? "Edit Product" : "Add Product"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">{formError}</div>}
              {warning && <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">{warning}</div>}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Name *</label>
                      <input type="text" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} className={inputClass} placeholder="e.g. Basmati Rice" required />
                    </div>
                    <div>
                      <label className={labelClass}>Slug</label>
                      <input type="text" value={form.slug} onChange={(e) => patchForm({ slug: e.target.value })} className={inputClass} placeholder="auto-generated from name" />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <select value={form.category} onChange={(e) => patchForm({ category: e.target.value, categoryId: e.target.value, subcategoryIds: [] })} className={selectClass}>
                        <option value="">Select category...</option>
                        {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Unit *</label>
                      <input type="text" value={form.unit} onChange={(e) => patchForm({ unit: e.target.value })} className={inputClass} placeholder="e.g. 1 kg, 500 g" required />
                    </div>
                    <div>
                      <label className={labelClass}>Price (₹) *</label>
                      <input type="number" value={form.price} onChange={(e) => patchForm({ price: e.target.value })} className={inputClass} placeholder="0" min="0" step="0.01" required />
                    </div>
                    <div>
                      <label className={labelClass}>Original Price (₹)</label>
                      <input type="number" value={form.originalPrice} onChange={(e) => patchForm({ originalPrice: e.target.value })} className={inputClass} placeholder="Optional" min="0" step="0.01" />
                    </div>
                    <div>
                      <label className={labelClass}>Discount %</label>
                      <input type="number" value={form.discountPercent} onChange={(e) => patchForm({ discountPercent: e.target.value })} className={inputClass} placeholder="Optional" min="0" max="100" />
                    </div>
                    <div>
                      <label className={labelClass}>Stock Quantity</label>
                      <input type="number" value={form.stockQuantity} onChange={(e) => patchForm({ stockQuantity: e.target.value })} className={inputClass} placeholder="0" min="0" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 pt-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={form.inStock} onChange={(e) => patchForm({ inStock: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      In Stock
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={form.isPublished} onChange={(e) => patchForm({ isPublished: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      Published
                    </label>
                  </div>
                </div>

                {/* Subcategories */}
                {availableSubcategories.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Subcategories</h3>
                    <div className="flex flex-wrap gap-2">
                      {availableSubcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggleSubcategory(sub.id || "")}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${form.subcategoryIds.includes(sub.id || "") ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400"}`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Images</h3>
                  <div>
                    <label className={labelClass}>Main Image</label>
                    <ImageUpload value={form.image} folder="products" onUpload={(img) => patchForm({ image: img })} onError={(msg) => setFormError(msg)} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelClass}>Gallery</label>
                      <button type="button" onClick={addImage} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                        <ImagePlus className="w-3.5 h-3.5" /> Add Image
                      </button>
                    </div>
                    <div className="space-y-2">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="flex-1">
                            <ImageUpload value={img} folder="products" onUpload={(value) => updateImage(idx, value)} onError={(msg) => setFormError(msg)} />
                          </div>
                          <button type="button" onClick={() => removeImage(idx)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description & Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Description & Details</h3>
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea value={form.description} onChange={(e) => patchForm({ description: e.target.value })} className={`${inputClass} min-h-[100px]`} placeholder="Product description..." />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Origin</label>
                      <input type="text" value={form.origin} onChange={(e) => patchForm({ origin: e.target.value })} className={inputClass} placeholder="e.g. India" />
                    </div>
                    <div>
                      <label className={labelClass}>Storage Info</label>
                      <input type="text" value={form.storageInfo} onChange={(e) => patchForm({ storageInfo: e.target.value })} className={inputClass} placeholder="e.g. Store in cool, dry place" />
                    </div>
                    <div>
                      <label className={labelClass}>Health Fact</label>
                      <input type="text" value={form.healthFact} onChange={(e) => patchForm({ healthFact: e.target.value })} className={inputClass} placeholder="e.g. Rich in fiber" />
                    </div>
                    <div>
                      <label className={labelClass}>Badges (comma-separated)</label>
                      <input type="text" value={form.badges} onChange={(e) => patchForm({ badges: e.target.value })} className={inputClass} placeholder="e.g. Bestseller, New" />
                    </div>
                    <div>
                      <label className={labelClass}>Tags (comma-separated)</label>
                      <input type="text" value={form.tags} onChange={(e) => patchForm({ tags: e.target.value })} className={inputClass} placeholder="e.g. organic, premium" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Nutritional Info (one per line)</label>
                    <textarea value={form.nutritionalInfo} onChange={(e) => patchForm({ nutritionalInfo: e.target.value })} className={`${inputClass} min-h-[80px]`} placeholder={"Calories: 350\nProtein: 8g\nFiber: 2g"} />
                  </div>
                </div>

                {/* Variants */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Variants</h3>
                    <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">
                      <Plus className="w-3.5 h-3.5" /> Add Variant
                    </button>
                  </div>
                  {form.variants.length === 0 ? (
                    <p className="text-sm text-slate-400">No variants. Add variants for different pack sizes (e.g. 500g, 1kg).</p>
                  ) : (
                    <div className="space-y-3">
                      {form.variants.map((variant, idx) => (
                        <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Variant {idx + 1}</span>
                            <button type="button" onClick={() => removeVariant(idx)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className={labelClass}>Unit *</label>
                              <input type="text" value={variant.unit} onChange={(e) => updateVariant(idx, { unit: e.target.value })} className={inputClass} placeholder="e.g. 500g" />
                            </div>
                            <div>
                              <label className={labelClass}>Price *</label>
                              <input type="number" value={variant.price} onChange={(e) => updateVariant(idx, { price: e.target.value })} className={inputClass} placeholder="0" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className={labelClass}>Original Price</label>
                              <input type="number" value={variant.originalPrice} onChange={(e) => updateVariant(idx, { originalPrice: e.target.value })} className={inputClass} placeholder="Optional" min="0" step="0.01" />
                            </div>
                            <div>
                              <label className={labelClass}>Discount %</label>
                              <input type="number" value={variant.discountPercent} onChange={(e) => updateVariant(idx, { discountPercent: e.target.value })} className={inputClass} placeholder="Optional" min="0" max="100" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <input type="checkbox" checked={variant.inStock} onChange={(e) => updateVariant(idx, { inStock: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                              In Stock
                            </label>
                            <div className="flex-1">
                              <ImageUpload value={variant.image} folder="products" onUpload={(img) => updateVariant(idx, { image: img })} onError={(msg) => setFormError(msg)} label="Variant image" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                    {saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : ("Save Product")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h2 id="delete-product-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete product?</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{deleteTarget.label} will be permanently removed. Uploaded Cloudinary images will also be cleaned up when possible.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
