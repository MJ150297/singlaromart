"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  Plus, Pencil, Trash2, Search, X, Loader2, Download, Filter,
  CheckSquare, Square, AlertTriangle,
  Copy, ChevronUp, ChevronDown,
} from "lucide-react";
import { ImageUpload } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";
import type { CloudinaryImage } from "@/lib/schemas";
import type { BannersSummary, InitialBanner } from "./page";

type ApiResponse<T> = { success: boolean; data: T; warnings?: string[]; error?: string };
type MutationResponse = { success: boolean; warnings?: string[]; error?: string };

interface Banner extends InitialBanner {}

interface BannerForm {
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image?: string | CloudinaryImage;
  order: string;
  isActive: boolean;
}

interface BannersResponse {
  items: Banner[];
  total: number;
  page: number;
  limit: number;
  summary?: BannersSummary;
}

const GRADIENTS = [
  { value: "from-emerald-500 to-teal-600", label: "Emerald → Teal" },
  { value: "from-orange-500 to-rose-600", label: "Orange → Rose" },
  { value: "from-blue-500 to-indigo-600", label: "Blue → Indigo" },
  { value: "from-purple-500 to-pink-600", label: "Purple → Pink" },
  { value: "from-amber-500 to-orange-600", label: "Amber → Orange" },
  { value: "from-cyan-500 to-blue-600", label: "Cyan → Blue" },
  { value: "from-rose-500 to-red-600", label: "Rose → Red" },
  { value: "from-lime-500 to-green-600", label: "Lime → Green" },
];

const emptyForm = (order: string): BannerForm => ({
  title: "",
  subtitle: "",
  badge: "",
  gradient: "from-emerald-500 to-teal-600",
  cta: "",
  image: "",
  order,
  isActive: true,
});

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function BannersClient({ initialBanners, initialSummary }: { initialBanners: Banner[]; initialSummary: BannersSummary | null }) {
  // ─── Search, filters & pagination ─────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("order");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // ─── Selection & bulk actions ─────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Toast helper (shared provider) ────────────────────────────────────
  const { toast } = useToast();

  // ─── Per-row loading (toggle / reorder) ───────────────────────────────
  const [busyId, setBusyId] = useState<string | null>(null);

  // ─── Reorder animation ────────────────────────────────────────────────
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(() => emptyForm("0"));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");

  // ─── Delete confirmation state ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const bannersKey = `/api/admin/banners?${params.toString()}`;
  const { data, isLoading, error, mutate } = useSWR<BannersResponse | null>(
    bannersKey,
    async (url) => {
      const res = await fetch(url);
      const d = (await res.json()) as ApiResponse<BannersResponse>;
      if (!d.success) throw new Error(d.error || "Failed to load banners");
      return d.data ?? null;
    },
    {
      fallbackData: {
        items: initialBanners,
        total: initialBanners.length,
        page: 1,
        limit,
        summary: initialSummary ?? undefined,
      },
      revalidateOnFocus: true,
    }
  );

  const banners = data?.items ?? [];
  const summary = data?.summary;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasActiveFilters = debouncedSearch || statusFilter !== "all" || sortBy !== "order" || sortOrder !== "asc";

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function patchForm(patch: Partial<BannerForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  const pushToast = useCallback((type: "success" | "error", message: string) => {
    toast[type](message);
  }, [toast]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSortBy("order");
    setSortOrder("asc");
    setPage(1);
  };

  const handleExportCsv = async () => {
    try {
      const exportParams = new URLSearchParams({ export: "csv" });
      if (debouncedSearch) exportParams.set("search", debouncedSearch);
      if (statusFilter !== "all") exportParams.set("isActive", statusFilter);
      const res = await fetch(`/api/admin/banners?${exportParams.toString()}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banners-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      pushToast("success", "CSV exported successfully");
    } catch {
      pushToast("error", "Failed to export CSV");
    }
  };

  const kpiCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: "Total Banners", value: summary.totalBanners, classes: "text-blue-600 dark:text-blue-400" },
      { label: "Active", value: summary.activeCount, classes: "text-emerald-600 dark:text-emerald-400" },
      { label: "Inactive", value: Math.max(0, summary.totalBanners - summary.activeCount), classes: "text-slate-600 dark:text-slate-400" },
    ];
  }, [summary]);

  const inputClass = "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  // ─── Form helpers ─────────────────────────────────────────────────────────
  function openCreateForm() {
    setEditingBanner(null);
    setForm(emptyForm(String(banners.length)));
    setShowForm(true);
    setErrorMsg("");
  }

  function openEditForm(banner: Banner) {
    setEditingBanner(banner);
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle || "",
      badge: banner.badge || "",
      gradient: banner.gradient || "from-emerald-500 to-teal-600",
      cta: banner.cta || "",
      image: banner.image || "",
      order: String(banner.order ?? 0),
      isActive: banner.isActive !== false,
    });
    setShowForm(true);
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const payload = {
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      badge: form.badge.trim() || undefined,
      gradient: form.gradient,
      cta: form.cta.trim() || undefined,
      order: Number(form.order) || 0,
      isActive: form.isActive,
      image: typeof form.image === "string" ? form.image.trim() || undefined : form.image,
    };

    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : "/api/admin/banners";
      const method = editingBanner ? "PUT" : "POST";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const responseData = (await res.json()) as MutationResponse;
      if (!res.ok || !responseData.success) {
        setErrorMsg(responseData.error || "Failed to save banner");
        setSaving(false);
        return;
      }

      if (responseData.warnings?.length) setWarning(responseData.warnings.join(" "));
      else setWarning("");

      setShowForm(false);
      pushToast("success", editingBanner ? "Banner updated successfully" : "Banner created successfully");
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save banner");
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
    setDeleting(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
        const responseData = (await res.json()) as MutationResponse;
        return { ok: res.ok && responseData.success, warning: responseData.warnings?.join(" "), error: responseData.error };
      }));
      const failed = results.filter((r) => !r.ok);
      const warnings = results.map((r) => r.warning).filter(Boolean);
      if (failed.length === 0) {
        pushToast(warnings.length ? "error" : "success", warnings.join(" ") || `${ids.length} banner${ids.length === 1 ? "" : "s"} deleted`);
        setSelected((prev) => prev.filter((s) => !ids.includes(s)));
        await mutate();
      } else pushToast("error", failed[0].error || `Failed to delete ${failed.length} banner${failed.length === 1 ? "" : "s"}`);
    } catch (err) { console.error(err); pushToast("error", "Failed to delete banner"); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  async function handleQuickToggle(id: string, field: "isActive", value: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/banners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const responseData = (await res.json()) as MutationResponse;
      if (res.ok && responseData.success) {
        pushToast("success", value ? "Banner activated" : "Banner deactivated");
        await mutate();
      } else {
        pushToast("error", responseData.error || "Failed to update banner");
      }
    } catch { pushToast("error", "Failed to update banner"); }
    finally { setBusyId(null); }
  }

  async function reorder(banner: Banner, direction: "up" | "down") {
    // Reorder within the currently displayed (paginated) list.
    const sorted = [...(banners ?? [])].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((o) => o.id === banner.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const neighbor = sorted[swapIdx];
    setBusyId(banner.id);
    setAnimatingId(banner.id);
    try {
      // Swap orders
      await Promise.all([
        fetch(`/api/admin/banners/${banner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: neighbor.order }),
        }),
        fetch(`/api/admin/banners/${neighbor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: banner.order }),
        }),
      ]);
      await mutate();
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to reorder banners");
    } finally {
      setBusyId(null);
      if (animTimer.current) clearTimeout(animTimer.current);
      animTimer.current = setTimeout(() => setAnimatingId(null), 400);
    }
  }

  async function duplicateBanner(banner: Banner) {
    setBusyId(banner.id);
    try {
      const payload = {
        title: `${banner.title} (Copy)`,
        subtitle: banner.subtitle,
        badge: banner.badge,
        gradient: banner.gradient,
        cta: banner.cta,
        image: banner.image,
        order: Math.max(0, ...(banners ?? []).map((b) => b.order)) + 1,
        isActive: false,
      };
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as MutationResponse;
      if (res.ok && data.success) {
        pushToast("success", "Banner duplicated");
        await mutate();
      } else {
        pushToast("error", data.error || "Failed to duplicate banner");
      }
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to duplicate banner");
    } finally {
      setBusyId(null);
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === banners.length && banners.length > 0) setSelected([]);
    else setSelected(banners.map((b) => b.id));
  };

  async function handleBulkAction() {
    if (!bulkAction || selected.length === 0) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        requestDelete(selected, `${selected.length} selected banner${selected.length === 1 ? "" : "s"}`);
        setBulkAction("");
      } else {
        const value = bulkAction === "activate" ? true : bulkAction === "deactivate" ? false : null;
        if (value === null) { setBulkLoading(false); return; }
        const results = await Promise.all(selected.map(async (id) => {
          const response = await fetch(`/api/admin/banners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: value }) });
          const responseData = (await response.json()) as MutationResponse;
          return response.ok && responseData.success;
        }));
        if (results.every(Boolean)) {
          pushToast("success", `Updated ${selected.length} banner${selected.length === 1 ? "" : "s"}`);
          setSelected([]); setBulkAction(""); await mutate();
        } else pushToast("error", "Some banners failed to update");
      }
    } catch { pushToast("error", "Failed to perform bulk action"); }
    finally { setBulkLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Banners</h1>
          <p className="text-sm text-slate-500 mt-1">Manage hero carousel banners</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"><Download className="inline w-4 h-4 mr-1" />Export</button>
          <button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add Banner</button>
        </div>
      </div>

      {/* Summary stat cards (offers style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.classes}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search banners" className={`${inputClass} pl-9`} aria-label="Search banners" />
        </div>
        <button onClick={() => setShowFilters((v) => !v)} className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Filter className="w-4 h-4" /> Filters
        </button>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            Clear
          </button>
        )}
      </div>

      {/* Sorting dropdowns in a grid (offers style) */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div>
            <label className={labelClass}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
              <option value="all">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
              <option value="order">Order</option>
              <option value="title">Title</option>
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Sort Direction</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={selectClass}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{selected.length} selected</span>
          <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className={`${selectClass} w-auto`} aria-label="Bulk action">
            <option value="">Bulk action</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Delete</option>
          </select>
          <button onClick={handleBulkAction} disabled={bulkLoading || !bulkAction} className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2">
            {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply
          </button>
        </div>
      )}

      {errorMsg && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">{errorMsg}</div>}
      {warning && <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">{warning}</div>}
      {error && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">Failed to load banners.</div>}

      {/* Banners List */}
      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No banners found</p>
          <p className="text-sm mt-1">
            {hasActiveFilters ? "Try adjusting your search or filters" : "Add your first banner to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <button onClick={toggleSelectAll} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            {selected.length === banners.length ? (
              <><CheckSquare className="inline w-4 h-4 mr-1" />Deselect all</>
            ) : (
              <><Square className="inline w-4 h-4 mr-1" />Select all</>
            )}
          </button>
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${
                animatingId === banner.id ? "scale-[0.98] border-emerald-400 shadow-lg" : ""
              }`}
            >
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected.includes(banner.id)}
                    onChange={() => toggleSelect(banner.id)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 shrink-0"
                    aria-label={`Select ${banner.title}`}
                  />
                  <div className={`w-16 h-12 rounded-lg bg-gradient-to-r ${banner.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {banner.badge || "Banner"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{banner.title}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      {banner.subtitle || "No subtitle"}
                      {" · "}Order: {banner.order}
                      {" · "}{formatDate(banner.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${banner.isActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleQuickToggle(banner.id, "isActive", !banner.isActive)}
                    disabled={busyId === banner.id}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${banner.isActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}
                    aria-label={banner.isActive ? "Deactivate banner" : "Activate banner"}
                  >
                    {busyId === banner.id ? <Loader2 className="w-3 h-3 animate-spin" /> : banner.isActive ? "On" : "Off"}
                  </button>
                  <div className="flex flex-col">
                    <button onClick={() => reorder(banner, "up")} disabled={busyId === banner.id} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-40 transition-colors" aria-label="Move banner up">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => reorder(banner, "down")} disabled={busyId === banner.id} className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-40 transition-colors" aria-label="Move banner down">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => duplicateBanner(banner)} disabled={busyId === banner.id} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors disabled:opacity-50" aria-label="Duplicate banner">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEditForm(banner)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors" aria-label="Edit banner">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => requestDelete([banner.id], banner.title)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors" aria-label="Delete banner">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      {/* Banner Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="banner-form-title" onKeyDown={(e) => { if (e.key === "Escape") setShowForm(false); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 id="banner-form-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingBanner ? "Edit Banner" : "Add Banner"}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input required placeholder="Title" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} className={inputClass} />
              <input placeholder="Subtitle" value={form.subtitle} onChange={(e) => patchForm({ subtitle: e.target.value })} className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Badge" value={form.badge} onChange={(e) => patchForm({ badge: e.target.value })} className={inputClass} />
                <input placeholder="CTA text" value={form.cta} onChange={(e) => patchForm({ cta: e.target.value })} className={inputClass} />
              </div>
              <select value={form.gradient} onChange={(e) => patchForm({ gradient: e.target.value })} className={inputClass}>
                {GRADIENTS.map((gradient) => <option key={gradient.value} value={gradient.value}>{gradient.label}</option>)}
              </select>
              <ImageUpload value={form.image} label="Upload banner image" folder="banners" onUpload={(image) => patchForm({ image })} onError={setErrorMsg} />
              <input type="text" value={typeof form.image === "string" ? form.image : ""} onChange={(e) => patchForm({ image: e.target.value })} placeholder="Image URL" className={inputClass} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" value={form.order} onChange={(e) => patchForm({ order: e.target.value })} className={inputClass} />
                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={form.isActive} onChange={(e) => patchForm({ isActive: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />Active</label>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="delete-confirm-title" onKeyDown={(e) => { if (e.key === "Escape") setDeleteTarget(null); }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 mb-3" />
            <h2 id="delete-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Banner</h2>
            <p className="text-sm text-slate-500 mt-2 mb-4">Delete {deleteTarget.label}? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}