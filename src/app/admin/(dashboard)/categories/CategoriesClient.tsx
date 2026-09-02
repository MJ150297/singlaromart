"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Plus, Pencil, Trash2, Search, X, Loader2,
  Download, RefreshCw, Filter, CheckSquare, Square, AlertTriangle,
  Package, Eye, EyeOff, Boxes, Tags,
} from "lucide-react";
import { ImageUpload } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";
import type { CloudinaryImage } from "@/lib/schemas";

type ApiResponse<T> = { success: boolean; data: T; warnings?: string[]; error?: string };

interface Subcategory {
  id?: string;
  name: string;
  slug?: string;
  image?: string | CloudinaryImage;
}

interface SubcategoryForm {
  id?: string;
  name: string;
  slug?: string;
  image?: string | CloudinaryImage;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  image?: string | CloudinaryImage;
  subcategories?: Subcategory[];
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CategoryForm {
  id?: string;
  name: string;
  slug?: string;
  icon: string;
  image?: string | CloudinaryImage;
  sortOrder?: string;
  isActive?: boolean;
  description?: string;
  subcategories: SubcategoryForm[];
}

interface Summary {
  totalCategories: number;
  activeCount: number;
  totalSubcategories: number;
  totalProducts: number;
}

interface CategoriesResponse {
  items: Category[];
  total: number;
  page: number;
  limit: number;
  summary?: Summary;
}

const PAGE_SIZES = [12, 24, 50, 100];

const emptySubcategory = (): SubcategoryForm => ({ name: "", image: "" });

const emptyForm = (): CategoryForm => ({
  name: "",
  slug: "",
  icon: "",
  image: "",
  sortOrder: "0",
  isActive: true,
  description: "",
  subcategories: [],
});

function imageUrl(img?: string | CloudinaryImage): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return (img.secureUrl as string) || (img.url as string) || ((img as CloudinaryImage).transformations?.card as string) || "";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CategoriesClient({ initialCategories, initialSummary }: { initialCategories: Category[]; initialSummary: Summary | null }) {
  // ─── Search, filters & pagination ──────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // ─── Selection & bulk actions ──────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sortBy, sortOrder, limit]);

  const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy, sortOrder });
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (statusFilter !== "all") params.set("isActive", statusFilter);

  const categoriesKey = `/api/admin/categories?${params.toString()}`;
  const { data, isLoading, error, mutate } = useSWR<CategoriesResponse | null>(
    categoriesKey,
    async (url) => {
      const res = await fetch(url);
      const d = (await res.json()) as ApiResponse<CategoriesResponse>;
      if (!d.success) throw new Error(d.error || "Failed to load categories");
      return d.data ?? null;
    },
    { fallbackData: null, revalidateOnFocus: true }
  );

  const categories = data?.items ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasActiveFilters = debouncedSearch || statusFilter !== "all";

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function patchForm(patch: Partial<CategoryForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const showToast = useCallback((type: "success" | "error", message: string) => {
    toast[type](message);
  }, [toast]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortBy("sortOrder");
    setSortOrder("asc");
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const exportParams = new URLSearchParams({ export: "csv" });
      if (debouncedSearch) exportParams.set("search", debouncedSearch);
      if (statusFilter !== "all") exportParams.set("isActive", statusFilter);
      const res = await fetch(`/api/admin/categories?${exportParams.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `categories-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("success", "CSV exported successfully");
    } catch {
      showToast("error", "Failed to export CSV");
    }
  };

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Categories", value: summary.totalCategories, icon: Tags, color: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
      { label: "Active", value: summary.activeCount, icon: Eye, color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" },
      { label: "Subcategories", value: summary.totalSubcategories, icon: Boxes, color: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" },
      { label: "Products", value: summary.totalProducts, icon: Package, color: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400" },
    ];
  }, [summary]);

  const inputClass = "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  // ─── Form helpers ─────────────────────────────────────────────────────────
  function openCreateForm() {
    setEditingCategory(null);
    setForm(emptyForm());
    setShowForm(true);
    setErrorMsg("");
  }

  function openEditForm(category: Category) {
    setEditingCategory(category);
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug || "",
      icon: category.icon || "",
      image: category.image || "",
      sortOrder: String(category.sortOrder ?? 0),
      isActive: category.isActive !== false,
      description: category.description || "",
      subcategories: (category.subcategories || []).map((s) => ({ id: s.id || "", name: s.name, slug: s.slug || "", image: s.image || "" })),
    });
    setShowForm(true);
    setErrorMsg("");
  }

  function addSubcategory() {
    patchForm({ subcategories: [...form.subcategories, emptySubcategory()] });
  }

  function updateSubcategory(index: number, patch: Partial<SubcategoryForm>) {
    patchForm({ subcategories: form.subcategories.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }

  function removeSubcategory(index: number) {
    patchForm({ subcategories: form.subcategories.filter((_, i) => i !== index) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: form.slug?.trim() || undefined,
      icon: form.icon?.trim() || undefined,
      description: form.description?.trim() || undefined,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive !== false,
      subcategories: form.subcategories
        .filter((s) => s.name.trim() !== "")
        .map((s) => ({ id: s.id?.trim() || undefined, name: s.name.trim(), slug: typeof s.slug === "string" ? s.slug.trim() || undefined : undefined, image: typeof s.image === "string" ? s.image.trim() || undefined : s.image })),
    };

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : "/api/admin/categories";
      const method = editingCategory ? "PUT" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "Failed to save category");
        setSaving(false);
        return;
      }

      if (data.warnings?.length) setWarning(data.warnings.join(" "));
      else setWarning("");

      setShowForm(false);
      showToast("success", editingCategory ? "Category updated successfully" : "Category created successfully");
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save category");
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
        const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
        const data = await res.json();
        return { ok: res.ok && data.success, warning: data.warnings?.join(" "), error: data.error };
      }));
      const failed = results.filter((r) => !r.ok);
      const warnings = results.map((r) => r.warning).filter(Boolean);
      if (failed.length === 0) {
        showToast(warnings.length ? "error" : "success", warnings.join(" ") || `${ids.length} categor${ids.length === 1 ? "y" : "ies"} deleted`);
        setSelected((prev) => prev.filter((s) => !ids.includes(s)));
        await mutate();
      } else showToast("error", failed[0].error || `Failed to delete ${failed.length} categor${failed.length === 1 ? "y" : "ies"}`);
    } catch (err) { console.error(err); showToast("error", "Failed to delete category"); }
  }

  async function handleQuickToggle(id: string, field: "isActive", value: boolean) {
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("success", value ? "Category activated" : "Category deactivated");
        await mutate();
      } else {
        showToast("error", data.error || "Failed to update category");
      }
    } catch { showToast("error", "Failed to update category"); }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === categories.length && categories.length > 0) setSelected([]);
    else setSelected(categories.map((c) => c.id));
  };

  async function handleBulkAction() {
    if (!bulkAction || selected.length === 0) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        requestDelete(selected, `${selected.length} selected categor${selected.length === 1 ? "y" : "ies"}`);
        setBulkAction("");
      } else {
        const value = bulkAction === "activate" ? true : bulkAction === "deactivate" ? false : null;
        if (value === null) { setBulkLoading(false); return; }
        const results = await Promise.all(selected.map((id) =>
          fetch(`/api/admin/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: value }) })
        ));
        if (results.every((r) => r.ok)) {
          showToast("success", `Updated ${selected.length} categor${selected.length === 1 ? "y" : "ies"}`);
          setSelected([]); setBulkAction(""); await mutate();
        } else showToast("error", "Some categories failed to update");
      }
    } catch { showToast("error", "Failed to perform bulk action"); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product categories and subcategories</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCsv} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={() => mutate()} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Category
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
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." className={`${inputClass} pl-9`} />
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort By</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
                <option value="sortOrder">Sort Order</option>
                <option value="name">Name</option>
                <option value="createdAt">Date Created</option>
                <option value="updatedAt">Last Updated</option>
                <option value="productCount">Product Count</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sort Order</label>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={selectClass}>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
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
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
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
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error instanceof Error ? error.message : "Failed to load categories"}</p>
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
      {!isLoading && !error && categories.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Tags className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No categories found</p>
          <p className="text-sm mt-1">{hasActiveFilters ? "Try adjusting your filters" : "Use the button above to add your first category"}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors">Clear Filters</button>
          )}
        </div>
      )}

      {/* Table View (Desktop) */}
      {!isLoading && !error && categories.length > 0 && (
        <>
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-emerald-600">
                      {selected.length === categories.length && categories.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  {["Category", "Slug", "Icon", "Subcategories", "Products", "Status", "Created", "Actions"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300 ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(category.id)} className="text-slate-400 hover:text-emerald-600">
                        {selected.includes(category.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {imageUrl(category.image) ? (
                          <div className="w-10 h-10 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl(category.image)} alt={category.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">{category.icon || "📦"}</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{category.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{category.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{category.slug || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{category.icon || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">{category.subcategories?.length || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 rounded-full">{category.productCount ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleQuickToggle(category.id, "isActive", !category.isActive)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${category.isActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(category.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleQuickToggle(category.id, "isActive", !category.isActive)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" title={category.isActive ? "Deactivate category" : "Activate category"}>
                          {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEditForm(category)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Edit category">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => requestDelete([category.id], category.name)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete category">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards View (Mobile) */}
          <div className="md:hidden space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {imageUrl(category.image) ? (
                      <div className="w-12 h-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                        <img src={imageUrl(category.image)} alt={category.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0">{category.icon || "📦"}</div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{category.name}</p>
                      <p className="text-xs text-slate-500">{category.slug} · {category.productCount ?? 0} products</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${category.isActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                    <button onClick={() => toggleSelect(category.id)} className="text-slate-400">
                      {selected.includes(category.id) ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{category.subcategories?.length || 0} subcategories · Sort {category.sortOrder ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleQuickToggle(category.id, "isActive", !category.isActive)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title={category.isActive ? "Deactivate category" : "Activate category"}>
                      {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditForm(category)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Edit category">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => requestDelete([category.id], category.name)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Delete category">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} categories</p>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="px-2 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
              </select>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </>
      )}

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingCategory ? "Edit Category" : "Add Category"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              {errorMsg && <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">{errorMsg}</div>}
              {warning && <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">{warning}</div>}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Name *</label>
                      <input type="text" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} className={inputClass} placeholder="e.g. Staples" required />
                    </div>
                    <div>
                      <label className={labelClass}>Icon (emoji)</label>
                      <input type="text" value={form.icon} onChange={(e) => patchForm({ icon: e.target.value })} className={inputClass} placeholder="🍚" />
                    </div>
                    <div>
                      <label className={labelClass}>Slug</label>
                      <input type="text" value={form.slug || ""} onChange={(e) => patchForm({ slug: e.target.value })} className={inputClass} placeholder="auto-generated from name" />
                    </div>
                    <div>
                      <label className={labelClass}>Sort Order</label>
                      <input type="number" value={form.sortOrder || "0"} onChange={(e) => patchForm({ sortOrder: e.target.value })} className={inputClass} placeholder="0" min="0" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <textarea value={form.description || ""} onChange={(e) => patchForm({ description: e.target.value })} className={`${inputClass} min-h-[80px]`} placeholder="Short description of this category..." />
                  </div>
                  <div>
                    <label className={labelClass}>Category Image</label>
                    <ImageUpload value={form.image} label="Upload category image" folder="categories" onUpload={(image) => patchForm({ image })} onError={(message) => setErrorMsg(message)} />
                    <p className="text-xs text-slate-400 mt-2">You can also paste a direct image URL below.</p>
                    <input type="text" value={typeof form.image === "string" ? form.image : ""} onChange={(e) => patchForm({ image: e.target.value })} placeholder="/images/category.jpg" className={inputClass} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pt-2">
                    <input type="checkbox" checked={form.isActive !== false} onChange={(e) => patchForm({ isActive: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Active
                  </label>
                </div>

                {/* Subcategories */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Subcategories</h3>
                    <button type="button" onClick={addSubcategory} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"><Plus className="w-3.5 h-3.5 inline" /> Add Subcategory</button>
                  </div>
                  {form.subcategories.length === 0 ? (
                    <p className="text-xs text-slate-400">No subcategories. Add subcategories to organize products within this category.</p>
                  ) : (
                    <div className="space-y-2">
                      {form.subcategories.map((sub, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex-1">
                            <input type="text" value={sub.name} onChange={(e) => updateSubcategory(index, { name: e.target.value })} placeholder="Subcategory name (e.g. Milk)" className={inputClass} />
                          </div>
                          <div className="flex-1">
                            <input type="text" value={sub.slug || ""} onChange={(e) => updateSubcategory(index, { slug: e.target.value })} placeholder="Slug (e.g. milk)" className={inputClass} />
                          </div>
                          <div className="flex-1">
                            <ImageUpload value={sub.image} label="Upload subcategory image" folder="subcategories" onUpload={(image) => updateSubcategory(index, { image })} onError={(message) => setErrorMsg(message)} />
                            <input type="text" value={typeof sub.image === "string" ? sub.image : ""} onChange={(e) => updateSubcategory(index, { image: e.target.value })} placeholder="Image URL" className={inputClass} />
                          </div>
                          <button type="button" onClick={() => removeSubcategory(index)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">{saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : ("Save Category")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-category-title">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <h2 id="delete-category-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete category?</h2>
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
