"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
  Copy,
  ChevronUp,
  ChevronDown,
  Eye,
  Filter,
  CheckSquare,
  Square,
} from "lucide-react";
import { ImageUpload } from "@/components/ui";
import type { CloudinaryImage } from "@/lib/schemas";
import { fetchApi } from "@/lib/swr";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";

interface Offer {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type: "tag" | "manual" | "category";
  tag?: string;
  productIds?: string[];
  categoryId?: string;
  bannerImage?: string | CloudinaryImage;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy?: string;
  updatedBy?: string;
}

interface OfferForm {
  id?: string;
  name: string;
  slug: string;
  description: string;
  type: "tag" | "manual" | "category";
  tag: string;
  productIds: string[];
  categoryId: string;
  bannerImage: string | CloudinaryImage;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
}

interface ProductOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  icon?: string;
}

interface ProductListResponse {
  items: ProductOption[];
  total?: number;
}

interface OfferListResponse {
  items: Offer[];
  total: number;
  page: number;
  limit: number;
}

const emptyForm: OfferForm = {
  name: "",
  slug: "",
  description: "",
  type: "tag",
  tag: "",
  productIds: [],
  categoryId: "",
  bannerImage: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  sortOrder: 0,
};

/** Format a Date/ISO string to a datetime-local input value (YYYY-MM-DDTHH:mm). */
function toLocalInputValue(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Format an ISO string for display (e.g. "08 Nov 2026, 3:00 PM"). */
function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compute status badge based on schedule + active toggle. */
function getStatus(offer: Offer): { label: string; classes: string } {
  const now = Date.now();
  const start = offer.startsAt ? new Date(offer.startsAt).getTime() : null;
  const end = offer.endsAt ? new Date(offer.endsAt).getTime() : null;

  if (!offer.isActive) {
    return {
      label: "Inactive",
      classes: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    };
  }
  if (start && now < start) {
    return {
      label: "Scheduled",
      classes: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
    };
  }
  if (end && now > end) {
    return {
      label: "Expired",
      classes: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    };
  }
  return {
    label: "Active",
    classes: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OffersClient({ initialOffers }: { initialOffers: Offer[] }) {
  // ── List state (search, filters, pagination) ──────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // ── Selection & bulk actions ──────────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // ── Form / modal state ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [dateError, setDateError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // ── Product picker state ──────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState(productSearch);
  const [productCategory, setProductCategory] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productLimit] = useState(50);

  // ── Delete confirmation state ─────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Toast helper (shared provider) ──────────────────────────────────────
  const { toast } = useToast();

  // ── Per-row loading (toggle / reorder) ────────────────────────────────────
  const [busyId, setBusyId] = useState<string | null>(null);

  // ── Reorder animation ─────────────────────────────────────────────────────
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Product count previews for tag/category offers ────────────────────────
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  // Debounce the list search box (server-side filtering).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Debounce the product search box (server-side filtering).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
      setProductPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // Auto-slug from name (only when the user hasn't manually edited the slug).
  useEffect(() => {
    if (!slugTouched && form.name.trim()) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name) }));
    }
  }, [form.name, slugTouched]);

  // Validate dates whenever they change.
  useEffect(() => {
    if (form.startsAt && form.endsAt) {
      const start = new Date(form.startsAt).getTime();
      const end = new Date(form.endsAt).getTime();
      if (!isNaN(start) && !isNaN(end) && end < start) {
        setDateError("End date must be on or after the start date");
      } else {
        setDateError("");
      }
    } else {
      setDateError("");
    }
  }, [form.startsAt, form.endsAt]);

  // Toast helper
  const pushToast = useCallback((type: "success" | "error", message: string) => {
    toast[type](message);
  }, [toast]);

  // ── SWR: offers list (paginated) ──────────────────────────────────────────
  const offersKey = `/admin/offers?page=${page}&limit=${limit}&search=${encodeURIComponent(
    debouncedSearch
  )}&type=${encodeURIComponent(typeFilter)}&status=${encodeURIComponent(statusFilter)}&sortBy=${encodeURIComponent(
    sortBy
  )}&sortOrder=${encodeURIComponent(sortOrder)}`;

  const { data: listResp, error: listError, mutate } = useSWR<OfferListResponse>(
    offersKey,
    () => fetchApi<OfferListResponse>(offersKey),
    {
      fallbackData: {
        items: initialOffers,
        total: initialOffers.length,
        page: 1,
        limit,
      },
    }
  );

  const offers = listResp?.items ?? [];
  const total = listResp?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── SWR: categories ───────────────────────────────────────────────────────
  const { data: categoriesData } = useSWR<CategoryOption[]>(
    "/admin/categories",
    () =>
      fetchApi<CategoryOption[]>("/admin/categories").then((arr) =>
        (arr ?? []).filter((c: CategoryOption) => c.id && c.id !== "all")
      ),
    { fallbackData: [] }
  );
  const categories = categoriesData ?? [];

  function categoryName(id?: string): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name || id;
  }

  // ── SWR: products for the Manual picker (server-side search + category filter) ──
  const productsKey =
    showForm && form.type === "manual"
      ? `/admin/products?limit=${productLimit}&page=${productPage}&search=${encodeURIComponent(
          debouncedProductSearch
        )}&categoryId=${encodeURIComponent(productCategory)}`
      : null;

  const { data: productsResp, isLoading: productsLoading } = useSWR<
    ProductListResponse | null
  >(
    productsKey,
    () => fetchApi<ProductListResponse>(productsKey as string),
    { fallbackData: null }
  );
  const productOptions = productsResp?.items ?? [];
  const productTotal = productsResp?.total ?? 0;
  const productTotalPages = Math.max(1, Math.ceil(productTotal / productLimit));

  // Extract tags from offers for tag-based selection (derived from SWR data)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (offers ?? []).forEach((offer: Offer) => {
      if (offer?.type === "tag" && offer?.tag) tags.add(offer.tag);
    });
    return [...tags].sort();
  }, [offers]);

  // ── Summary stats (computed from the full list across pages) ──────────────
  // We fetch all offers once (no pagination) for accurate counts.
  const { data: allOffers } = useSWR<Offer[]>(
    "/admin/offers?limit=1000",
    () =>
      fetchApi<OfferListResponse>("/admin/offers?limit=1000").then(
        (r) => r.items
      ),
    { fallbackData: [] }
  );

  const stats = useMemo(() => {
    const s = { active: 0, scheduled: 0, expired: 0, inactive: 0 };
    (allOffers ?? []).forEach((o) => {
      const status = getStatus(o).label;
      if (status === "Active") s.active++;
      else if (status === "Scheduled") s.scheduled++;
      else if (status === "Expired") s.expired++;
      else s.inactive++;
    });
    return s;
  }, [allOffers]);

  // ── Product count preview for tag/category offers ─────────────────────────
  useEffect(() => {
    const needsCount = (offers ?? []).filter(
      (o) => o.type === "tag" || o.type === "category"
    );
    if (needsCount.length === 0) return;
    needsCount.forEach((o) => {
      if (productCounts[o.id] !== undefined) return;
      const url =
        o.type === "tag"
          ? `/api/products?tags=${encodeURIComponent(o.tag || "")}&limit=1`
          : `/api/products?categoryId=${encodeURIComponent(o.categoryId || "")}&limit=1`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && typeof data?.data?.total === "number") {
            setProductCounts((prev) => ({ ...prev, [o.id]: data.data.total }));
          }
        })
        .catch(() => {});
    });
  }, [offers, productCounts]);

  // ── Form handlers ─────────────────────────────────────────────────────────
  function openCreateForm() {
    setEditingOffer(null);
    setForm({
      ...emptyForm,
      // Append after the current last offer so sort orders stay unique.
      sortOrder: Math.max(0, ...(allOffers ?? []).map((o) => o.sortOrder)) + 1,
    });
    setSlugTouched(false);
    setProductSearch("");
    setProductCategory("");
    setProductPage(1);
    setShowForm(true);
    setErrorMsg("");
    setWarning("");
    setDateError("");
  }

  function openEditForm(offer: Offer) {
    setEditingOffer(offer);
    setForm({
      id: offer.id,
      name: offer.name,
      slug: offer.slug || "",
      description: offer.description || "",
      type: offer.type || "tag",
      tag: offer.tag || "",
      productIds: offer.productIds || [],
      categoryId: offer.categoryId || "",
      bannerImage: offer.bannerImage || "",
      startsAt: toLocalInputValue(offer.startsAt),
      endsAt: toLocalInputValue(offer.endsAt),
      isActive: offer.isActive ?? true,
      sortOrder: offer.sortOrder || 0,
    });
    setSlugTouched(true);
    setProductSearch("");
    setProductCategory("");
    setProductPage(1);
    setShowForm(true);
    setErrorMsg("");
    setWarning("");
    setDateError("");
  }

  function toggleProduct(id: string) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((p) => p !== id)
        : [...prev.productIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dateError) {
      setErrorMsg(dateError);
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const payload = {
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      tag: form.type === "tag" ? form.tag.trim().toLowerCase() : undefined,
      productIds:
        form.type === "manual" ? form.productIds.filter(Boolean) : undefined,
      categoryId:
        form.type === "category"
          ? form.categoryId.trim() || undefined
          : undefined,
      bannerImage:
        typeof form.bannerImage === "string"
          ? form.bannerImage.trim() || undefined
          : form.bannerImage,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
      sortOrder: Number(form.sortOrder) || 0,
    };

    try {
      const url = editingOffer
        ? `/api/admin/offers/${editingOffer.id}`
        : "/api/admin/offers";
      const method = editingOffer ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!resData.success) {
        setErrorMsg(resData.error || "Failed to save offer");
        setSaving(false);
        return;
      }

      if (resData.warnings?.length) {
        setWarning(resData.warnings.join(" "));
      } else {
        setWarning("");
      }

      setShowForm(false);
      pushToast("success", editingOffer ? "Offer updated" : "Offer created");
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save offer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(offer: Offer) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        if (data.warnings?.length) setWarning(data.warnings.join(" "));
        else setWarning("");
        pushToast("success", "Offer deleted");
        await mutate();
      } else {
        pushToast("error", data.error || "Failed to delete offer");
      }
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to delete offer");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function toggleActive(offer: Offer) {
    setBusyId(offer.id);
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        pushToast("success", offer.isActive ? "Offer deactivated" : "Offer activated");
        await mutate();
      } else {
        pushToast("error", data.error || "Failed to update offer");
      }
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to update offer");
    } finally {
      setBusyId(null);
    }
  }

  async function reorder(offer: Offer, direction: "up" | "down") {
    // Reorder within the currently displayed (paginated) list.
    const sorted = [...(offers ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );
    const idx = sorted.findIndex((o) => o.id === offer.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;

    const neighbor = sorted[swapIdx];
    setBusyId(offer.id);
    setAnimatingId(offer.id);
    try {
      // Swap sort orders
      await Promise.all([
        fetch(`/api/admin/offers/${offer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
        }),
        fetch(`/api/admin/offers/${neighbor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: offer.sortOrder }),
        }),
      ]);
      await mutate();
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to reorder offers");
    } finally {
      setBusyId(null);
      // Clear the animation flag after the transition completes.
      if (animTimer.current) clearTimeout(animTimer.current);
      animTimer.current = setTimeout(() => setAnimatingId(null), 400);
    }
  }

  async function duplicateOffer(offer: Offer) {
    setBusyId(offer.id);
    try {
      const payload = {
        name: `${offer.name} (Copy)`,
        slug: `${offer.slug || slugify(offer.name)}-copy`,
        description: offer.description,
        type: offer.type,
        tag: offer.type === "tag" ? offer.tag : undefined,
        productIds: offer.type === "manual" ? offer.productIds : undefined,
        categoryId: offer.type === "category" ? offer.categoryId : undefined,
        bannerImage: offer.bannerImage,
        startsAt: offer.startsAt,
        endsAt: offer.endsAt,
        isActive: false,
        sortOrder: Math.max(0, ...(allOffers ?? []).map((o) => o.sortOrder)) + 1,
      };
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        pushToast("success", "Offer duplicated");
        await mutate();
      } else {
        pushToast("error", data.error || "Failed to duplicate offer");
      }
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to duplicate offer");
    } finally {
      setBusyId(null);
    }
  }

  // ── Selection & bulk action handlers ──────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === offers.length && offers.length > 0) setSelected([]);
    else setSelected(offers.map((o) => o.id));
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setSortBy("sortOrder");
    setSortOrder("asc");
    setPage(1);
  };

  async function handleBulkAction() {
    if (!bulkAction || selected.length === 0) return;
    setBulkLoading(true);
    try {
      if (bulkAction === "delete") {
        // Delete all selected offers
        const results = await Promise.all(
          selected.map(async (id) => {
            const res = await fetch(`/api/admin/offers/${id}`, {
              method: "DELETE",
            });
            const data = await res.json();
            return { ok: res.ok && data.success, error: data.error };
          })
        );
        const failed = results.filter((r) => !r.ok);
        if (failed.length === 0) {
          pushToast("success", `${selected.length} offer${selected.length === 1 ? "" : "s"} deleted`);
          setSelected([]);
          setBulkAction("");
          await mutate();
        } else {
          pushToast("error", failed[0].error || `Failed to delete ${failed.length} offer${failed.length === 1 ? "" : "s"}`);
        }
      } else {
        const value = bulkAction === "activate" ? true : bulkAction === "deactivate" ? false : null;
        if (value === null) {
          setBulkLoading(false);
          return;
        }
        const results = await Promise.all(
          selected.map(async (id) => {
            const res = await fetch(`/api/admin/offers/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isActive: value }),
            });
            const data = await res.json();
            return res.ok && data.success;
          })
        );
        if (results.every(Boolean)) {
          pushToast("success", `Updated ${selected.length} offer${selected.length === 1 ? "" : "s"}`);
          setSelected([]);
          setBulkAction("");
          await mutate();
        } else {
          pushToast("error", "Some offers failed to update");
        }
      }
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to perform bulk action");
    } finally {
      setBulkLoading(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;
  const labelClass =
    "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  const statCards = [
    { label: "Active", value: stats.active, classes: "text-emerald-600 dark:text-emerald-400" },
    { label: "Scheduled", value: stats.scheduled, classes: "text-blue-600 dark:text-blue-400" },
    { label: "Expired", value: stats.expired, classes: "text-amber-600 dark:text-amber-400" },
    { label: "Inactive", value: stats.inactive, classes: "text-slate-600 dark:text-slate-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Offers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage dynamic homepage carousel offers
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Offer
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {s.label}
            </p>
            <p className={`text-2xl font-bold mt-1 ${s.classes}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search offers by name..."
            className={`${inputClass} pl-9`}
            aria-label="Search offers"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Filter className="w-4 h-4" /> Filters
        </button>
        {(search || typeFilter || statusFilter || sortBy !== "sortOrder" || sortOrder !== "asc") && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Sorting dropdowns in a grid */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All types</option>
              <option value="tag">By Tag</option>
              <option value="category">By Category</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="sortOrder">Sort Order</option>
              <option value="name">Name</option>
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Sort Direction</label>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {selected.length} selected
          </span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className={`${selectClass} w-auto`}
            aria-label="Bulk action"
          >
            <option value="">Bulk action</option>
            <option value="activate">Activate</option>
            <option value="deactivate">Deactivate</option>
            <option value="delete">Delete</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={bulkLoading || !bulkAction}
            className="px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {bulkLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">
          {errorMsg}
        </div>
      )}
      {warning && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">
          {warning}
        </div>
      )}
      {listError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">
          Failed to load offers
        </div>
      )}

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No offers found</p>
          <p className="text-sm mt-1">
            {search || typeFilter || statusFilter
              ? "Try adjusting your search or filters"
              : "Add your first offer to get started"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={toggleSelectAll}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {selected.length === offers.length ? (
              <>
                <CheckSquare className="inline w-4 h-4 mr-1" />Deselect all
              </>
            ) : (
              <>
                <Square className="inline w-4 h-4 mr-1" />Select all
              </>
            )}
          </button>
          {offers.map((offer) => {
            const status = getStatus(offer);
            const count =
              offer.type === "manual"
                ? (offer.productIds || []).length
                : productCounts[offer.id];
            return (
              <div
                key={offer.id}
                className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-300 ${
                  animatingId === offer.id
                    ? "scale-[0.98] border-emerald-400 shadow-lg"
                    : ""
                }`}
              >
                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <input
                      type="checkbox"
                      checked={selected.includes(offer.id)}
                      onChange={() => toggleSelect(offer.id)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 shrink-0"
                      aria-label={`Select ${offer.name}`}
                    />
                    <div className="w-16 h-12 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {offer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {offer.name}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        {offer.type === "tag"
                          ? `Tag: ${offer.tag || "—"}`
                          : offer.type === "category"
                          ? `Category: ${categoryName(offer.categoryId)}`
                          : `Manual: ${(offer.productIds || []).length} products`}
                        {count !== undefined && offer.type !== "manual" && (
                          <> · {count} products</>
                        )}
                        {" · "}
                        {formatDate(offer.startsAt)} → {formatDate(offer.endsAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full ${status.classes}`}
                    >
                      {status.label}
                    </span>
                    <button
                      onClick={() => toggleActive(offer)}
                      disabled={busyId === offer.id}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
                        offer.isActive
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                      aria-label={offer.isActive ? "Deactivate offer" : "Activate offer"}
                    >
                      {busyId === offer.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : offer.isActive ? (
                        "On"
                      ) : (
                        "Off"
                      )}
                    </button>
                    <div className="flex flex-col">
                      <button
                        onClick={() => reorder(offer, "up")}
                        disabled={busyId === offer.id}
                        className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-40 transition-colors"
                        aria-label="Move offer up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => reorder(offer, "down")}
                        disabled={busyId === offer.id}
                        className="p-1 text-slate-400 hover:text-emerald-600 disabled:opacity-40 transition-colors"
                        aria-label="Move offer down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => duplicateOffer(offer)}
                      disabled={busyId === offer.id}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors disabled:opacity-50"
                      aria-label="Duplicate offer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditForm(offer)}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                      aria-label="Edit offer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(offer)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      aria-label="Delete offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Offer Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-form-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowForm(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2
                  id="offer-form-title"
                  className="text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  {editingOffer ? "Edit Offer" : "Add Offer"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                    aria-label="Preview offer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>Offer Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Summer Trends"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Slug</label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setForm({ ...form, slug: e.target.value });
                      }}
                      placeholder="summer-trends"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Sort Order</label>
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) =>
                        setForm({ ...form, sortOrder: Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={2}
                    placeholder="e.g. Refreshing picks for the hot season"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Selection Type *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "tag" })}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.type === "tag"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        🏷️ By Tag
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        Auto-include all products with a tag
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "category" })}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.type === "category"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        📂 By Category
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        Auto-include all products in a category
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: "manual" })}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        form.type === "manual"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        👆 Manual
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        Hand-pick exact products
                      </span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Products are selected by one source only (tag, category, or
                    manual) — switching types clears the saved selection of the
                    other sources on save.
                  </p>
                </div>

                {form.type === "tag" ? (
                  <div>
                    <label className={labelClass}>Tag *</label>
                    <input
                      type="text"
                      list="offer-tags"
                      value={form.tag}
                      onChange={(e) => setForm({ ...form, tag: e.target.value })}
                      required
                      placeholder="e.g. summer, festival, deal"
                      className={inputClass}
                    />
                    <datalist id="offer-tags">
                      {allTags.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                    <p className="text-xs text-slate-400 mt-1">
                      All published products carrying this tag will appear.
                    </p>
                  </div>
                ) : form.type === "category" ? (
                  <div>
                    <label className={labelClass}>Category *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) =>
                        setForm({ ...form, categoryId: e.target.value })
                      }
                      required
                      className={selectClass}
                    >
                      <option value="">Select a category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      All published products in this category will appear.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className={labelClass}>Select Products</label>

                    {/* Category filter for faster browsing */}
                    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 mb-2">
                      <select
                        value={productCategory}
                        onChange={(e) => setProductCategory(e.target.value)}
                        className={inputClass}
                      >
                        <option value="">All categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products..."
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-2">
                      {form.productIds.length} selected
                    </p>

                    <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                      {productsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                          <span className="ml-2 text-xs text-slate-400">
                            Loading products...
                          </span>
                        </div>
                      ) : productOptions.length === 0 ? (
                        <p className="p-3 text-sm text-slate-400">
                          No products found
                        </p>
                      ) : (
                        productOptions.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <input
                              type="checkbox"
                              checked={form.productIds.includes(p.id)}
                              onChange={() => toggleProduct(p.id)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                            />
                            {p.name}
                          </label>
                        ))
                      )}
                    </div>

                    {/* Load more for the product picker */}
                    {productTotalPages > 1 && productPage < productTotalPages && (
                      <button
                        type="button"
                        onClick={() => setProductPage((p) => p + 1)}
                        className="mt-2 w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                      >
                        Load more products ({productPage * productLimit} / {productTotal})
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Banner Image</label>
                  <ImageUpload
                    value={form.bannerImage}
                    label="Upload banner image"
                    folder="offers"
                    onUpload={(image) => setForm({ ...form, bannerImage: image })}
                    onError={(message) => setErrorMsg(message)}
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    You can also paste a direct image URL below.
                  </p>
                  <input
                    type="text"
                    value={
                      typeof form.bannerImage === "string" ? form.bannerImage : ""
                    }
                    onChange={(e) =>
                      setForm({ ...form, bannerImage: e.target.value })
                    }
                    placeholder="/images/offer.jpg"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Start Date</label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) =>
                        setForm({ ...form, startsAt: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>End Date</label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) =>
                        setForm({ ...form, endsAt: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
                {dateError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {dateError}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Leave dates empty for an always-visible offer (while active).
                  The offer appears only between start and end dates. Times use your browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm text-slate-700 dark:text-slate-300"
                  >
                    Active (manual override — can show/hide within schedule)
                  </label>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !!dateError}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />Saving...
                      </>
                    ) : (
                      "Save Offer"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Offer Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offer-preview-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowPreview(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="offer-preview-title"
                  className="text-lg font-bold text-slate-900 dark:text-slate-100"
                >
                  Offer Preview
                </h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      {form.name || "Untitled Offer"}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {form.type === "tag"
                      ? `Tag: ${form.tag || "—"}`
                      : form.type === "category"
                      ? `Category: ${categoryName(form.categoryId)}`
                      : `Manual: ${form.productIds.length} products`}
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {Array.from({ length: Math.min(6, Math.max(1, form.productIds.length || 3)) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="w-40 shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                      >
                        <div className="w-full h-20 rounded-md bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mt-2" />
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mt-1" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          onKeyDown={(e) => {
            if (e.key === "Escape") setDeleteTarget(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2
              id="delete-confirm-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Delete Offer
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
