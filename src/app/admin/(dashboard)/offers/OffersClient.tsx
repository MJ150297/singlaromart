"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, X, Loader2, Search } from "lucide-react";
import { ImageUpload } from "@/components/ui";
import type { CloudinaryImage, Product } from "@/lib/schemas";
import { fetchApi } from "@/lib/swr";

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

export default function OffersClient({ initialOffers }: { initialOffers: Offer[] }) {
  const { data, error, mutate } = useSWR<Offer[]>("/admin/offers", () => fetchApi<Offer[]>("/admin/offers").then((arr) => arr ?? []), {
    fallbackData: initialOffers,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState(productSearch);
  const [productCategory, setProductCategory] = useState("");

  // Debounce the product search box (server-side filtering).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProductSearch(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // Categories — used by the "By Category" type and the Manual picker filter.
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

  // Products for the Manual picker (server-side search + category filter).
  const productsKey =
    showForm && form.type === "manual"
      ? `/admin/products?limit=100&search=${encodeURIComponent(
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

  // Extract tags from offers for tag-based selection (derived from SWR data)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (data ?? []).forEach((offer: Offer) => {
      if (offer?.type === "tag" && offer?.tag) tags.add(offer.tag);
    });
    return [...tags].sort();
  }, [data]);

  function openCreateForm() {
    setEditingOffer(null);
    setForm({
      ...emptyForm,
      // Append after the current last offer so sort orders stay unique.
      sortOrder: Math.max(0, ...(data ?? []).map((o) => o.sortOrder)) + 1,
    });
    setProductSearch("");
    setProductCategory("");
    setShowForm(true);
    setErrorMsg("");
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
    setProductSearch("");
    setProductCategory("");
    setShowForm(true);
    setErrorMsg("");
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
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save offer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      const res = await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        if (data.warnings?.length) setWarning(data.warnings.join(" "));
        else setWarning("");
        await mutate();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleActive(offer: Offer) {
    try {
      const res = await fetch(`/api/admin/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      const data = await res.json();
      if (data.success) await mutate();
    } catch (err) {
      console.error(err);
    }
  }

  const inputClass =
    "w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100";
  const selectClass = `${inputClass} pr-8`;
  const labelClass =
    "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  return (
    <div className="space-y-6">
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

      {/* Offer Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editingOffer ? "Edit Offer" : "Add Offer"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
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
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
                <p className="text-xs text-slate-400">
                  Leave dates empty for an always-visible offer (while active).
                  The offer appears only between start and end dates.
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
                    disabled={saving}
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

      {/* Offers List */}
      {data ? (
        data.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">No offers found</p>
            <p className="text-sm mt-1">Add your first offer to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((offer) => {
              const status = getStatus(offer);
              return (
                <div
                  key={offer.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                >
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
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
                          {" · "}
                          {formatDate(offer.startsAt)} → {formatDate(offer.endsAt)}
                          {" · "}Order: {offer.sortOrder}
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
                        className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                          offer.isActive
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {offer.isActive ? "On" : "Off"}
                      </button>
                      <button
                        onClick={() => openEditForm(offer)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(offer.id)}
                        className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}