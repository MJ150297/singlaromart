"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Search,
  Pencil,
  Archive,
  Play,
  X,
} from "lucide-react";
import useSWR from "swr";
import { fetchApi, fetchRaw } from "@/lib/swr";
import { fetchJson } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { Pagination } from "@/components/Pagination";

// ─── Types & helpers ────────────────────────────────────────────────────────

const DELIVERY_SLOT_OPTIONS = [
  "Morning (8 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
];

interface DeliveryRule {
  id: string;
  name: string;
  appliesTo: {
    productIds?: string[];
    subcategoryIds?: string[];
    categoryIds?: string[];
    allProducts?: boolean;
  };
  userEligibility?: { userType: "all" | "new" | "existing"; minimumOrders?: number | null };
  deliverySlots?: string[];
  feeType: "flat" | "free_over_threshold";
  amount: number;
  minOrderAmount?: number | null;
  priority: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

interface RuleForm {
  name: string;
  productIds: string[];
  categoryIds: string[];
  allProducts: boolean;
  userType: "all" | "new" | "existing";
  minimumOrders: string;
  deliverySlots: string[];
  feeType: "flat" | "free_over_threshold";
  amount: string;
  minOrderAmount: string;
  priority: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
}

interface RuleListResponse {
  items: DeliveryRule[];
  total: number;
  page: number;
  limit: number;
}

const emptyForm: RuleForm = {
  name: "",
  productIds: [],
  categoryIds: [],
  allProducts: false,
  userType: "all",
  minimumOrders: "",
  deliverySlots: [],
  feeType: "flat",
  amount: "0",
  minOrderAmount: "",
  priority: "0",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ruleToForm(rule: DeliveryRule): RuleForm {
  return {
    name: rule.name,
    productIds: [...(rule.appliesTo?.productIds ?? [])],
    categoryIds: [...(rule.appliesTo?.categoryIds ?? [])],
    allProducts: rule.appliesTo?.allProducts === true,
    userType: rule.userEligibility?.userType ?? "all",
    minimumOrders: rule.userEligibility?.minimumOrders ? String(rule.userEligibility.minimumOrders) : "",
    deliverySlots: [...(rule.deliverySlots ?? [])],
    feeType: rule.feeType,
    amount: String(rule.amount ?? 0),
    minOrderAmount: rule.minOrderAmount ? String(rule.minOrderAmount) : "",
    priority: String(rule.priority ?? 0),
    isActive: rule.isActive !== false,
    startsAt: toLocalInputValue(rule.startsAt),
    endsAt: toLocalInputValue(rule.endsAt),
  };
}

function toNum(value: string): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formToPayload(form: RuleForm) {
  const minimumOrders = toNum(form.minimumOrders);
  const minOrderAmount = form.feeType === "free_over_threshold" ? toNum(form.minOrderAmount) : null;
  return {
    name: form.name.trim(),
    appliesTo: {
      productIds: form.productIds,
      subcategoryIds: [],
      categoryIds: form.categoryIds,
      allProducts: form.allProducts,
    },
    userEligibility: { userType: form.userType, minimumOrders },
    deliverySlots: form.deliverySlots,
    feeType: form.feeType,
    amount: toNum(form.amount) ?? 0,
    minOrderAmount,
    priority: toNum(form.priority) ?? 0,
    isActive: form.isActive,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
  };
}

function scopeSummary(rule: DeliveryRule): string {
  const s = rule.appliesTo ?? {};
  if (s.allProducts) return "All products";
  const parts: string[] = [];
  if (s.productIds?.length) parts.push(`${s.productIds.length} product(s)`);
  if (s.categoryIds?.length) parts.push(`${s.categoryIds.length} category(ies)`);
  return parts.join(" + ") || "—";
}

function feeSummary(rule: DeliveryRule): string {
  if (rule.feeType === "free_over_threshold") return `Free over ₹${rule.minOrderAmount ?? 0}`;
  return rule.amount === 0 ? "Free" : `₹${rule.amount}`;
}

function statusBadge(rule: DeliveryRule): { label: string; classes: string } {
  const now = Date.now();
  const start = rule.startsAt ? new Date(rule.startsAt).getTime() : null;
  const end = rule.endsAt ? new Date(rule.endsAt).getTime() : null;
  if (!rule.isActive) {
    return { label: "Archived", classes: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400" };
  }
  if (start && now < start) {
    return { label: "Scheduled", classes: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" };
  }
  if (end && now > end) {
    return { label: "Expired", classes: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" };
  }
  return { label: "Active", classes: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" };
}

export default function DeliveryFeesClient() {
  const { toast } = useToast();

  // ── List state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DeliveryRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const listKey = `/admin/delivery-fees?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`;
  const { data, isLoading, mutate } = useSWR<RuleListResponse>(listKey, fetchRaw, { keepPreviousData: true });

  // ── Product picker (search products API) ─────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Array<{ id: string; name: string; unit?: string }>>([]);
  const [productLoading, setProductLoading] = useState(false);

  useEffect(() => {
    if (productSearch.trim().length < 2) return;
    let cancelled = false;
    fetchApi<{ items: Array<{ id: string; name: string; unit?: string }> }>(
      `/admin/products?search=${encodeURIComponent(productSearch)}&page=1&limit=15`
    )
      .then((res) => { if (!cancelled) setProductResults(res.items ?? []); })
      .catch(() => { if (!cancelled) setProductResults([]); })
      .finally(() => { if (!cancelled) setProductLoading(false); });
    return () => { cancelled = true; };
  }, [productSearch]);

  const pushToast = (type: "success" | "error", message: string) => toast[type](message);

  // ── Actions ───────────────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(""); setShowForm(true); };

  const openEdit = (rule: DeliveryRule) => { setEditing(rule); setForm(ruleToForm(rule)); setFormError(""); setShowForm(true); };

  const saveRule = async () => {
    if (form.name.trim().length < 2) { setFormError("Name must be at least 2 characters"); return; }
    setSaving(true);
    setFormError("");
    try {
      const res = await fetchJson<{ success: boolean; error?: unknown }>(
        editing ? `/admin/delivery-fees/${editing.id}` : "/admin/delivery-fees",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToPayload(form)),
        }
      );
      if (!res.success) { setFormError("Unable to save rule"); return; }
      pushToast("success", editing ? "Rule updated" : "Rule created");
      setShowForm(false);
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save rule");
    } finally {
      setSaving(false);
    }
  };

  const archiveRule = async (rule: DeliveryRule) => {
    if (!window.confirm(`Archive rule "${rule.name}"? It will stop applying.`)) return;
    try {
      const res = await fetchJson<{ success: boolean; error?: string }>(
        `/admin/delivery-fees/${rule.id}`,
        { method: "DELETE", headers: { "Content-Type": "application/json" } }
      );
      if (!res.success) throw new Error(res.error || "Failed to archive");
      pushToast("success", "Rule archived");
      await mutate();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to archive");
    }
  };

  const toggleActive = async (rule: DeliveryRule) => {
    try {
      const next = { ...ruleToForm(rule), isActive: !rule.isActive };
      const res = await fetchJson<{ success: boolean; error?: string }>(
        `/admin/delivery-fees/${rule.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formToPayload(next)),
        }
      );
      if (!res.success) throw new Error(res.error || "Failed to toggle");
      pushToast("success", next.isActive ? "Rule enabled" : "Rule disabled");
      await mutate();
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to toggle");
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delivery Fees</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configurable per product, category, user type, and delivery slot.
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rules…"
            className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 bg-white py-2 pr-8 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Archived</option>
        </select>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Rule</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Applies to</th>
              <th className="px-4 py-3 font-medium">Fee</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No delivery fee rules yet. Pricing falls back to ₹0.</td></tr>
            ) : items.map((rule) => {
              const badge = statusBadge(rule);
              return (
                <tr key={rule.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{rule.name}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{scopeSummary(rule)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {rule.userEligibility?.userType ?? "all"}
                    {rule.deliverySlots?.length ? ` · ${rule.deliverySlots.length} slot(s)` : ""}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{feeSummary(rule)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{rule.priority}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.classes}`}>{badge.label}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button title={rule.isActive ? "Disable" : "Enable"} onClick={() => toggleActive(rule)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                        <Play className="h-4 w-4" />
                      </button>
                      <button title="Edit" onClick={() => openEdit(rule)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button title="Archive" onClick={() => archiveRule(rule)} className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950">
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.total > limit && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(data.total / limit))}
            onPageChange={setPage}
          />
        </div>
      )}

      {showForm && (
        <RuleFormModal
          form={form} setForm={setForm} editing={editing} saving={saving} errorMsg={formError}
          productResults={productResults} productLoading={productLoading}
          productSearch={productSearch} setProductSearch={setProductSearch}
          onSave={saveRule} onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

interface RuleFormModalProps {
  form: RuleForm;
  setForm: (next: RuleForm) => void;
  editing: DeliveryRule | null;
  saving: boolean;
  errorMsg: string;
  productResults: Array<{ id: string; name: string; unit?: string }>;
  productLoading: boolean;
  productSearch: string;
  setProductSearch: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function RuleFormModal({
  form,
  setForm,
  editing,
  saving,
  errorMsg,
  productResults,
  productLoading,
  productSearch,
  setProductSearch,
  onSave,
  onClose,
}: RuleFormModalProps) {
  const update = (patch: Partial<RuleForm>) => setForm({ ...form, ...patch });

  const toggleSlot = (slot: string) => {
    const has = form.deliverySlots.includes(slot);
    update({
      deliverySlots: has ? form.deliverySlots.filter((s) => s !== slot) : [...form.deliverySlots, slot],
    });
  };

  const addProduct = (id: string) => {
    if (!form.productIds.includes(id)) update({ productIds: [...form.productIds, id] });
  };

  const removeProduct = (id: string) => {
    update({ productIds: form.productIds.filter((p) => p !== id) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {editing ? "Edit rule" : "New delivery fee rule"}
          </h2>
          <button onClick={onClose} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Rule name</label>
              <input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Free delivery over ₹500" className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.isActive} onChange={(e) => update({ isActive: e.target.checked })} className="h-4 w-4 accent-emerald-600" />
              Active
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">Scope</legend>
            <div className="flex items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2">
                <input type="radio" name="scope" checked={form.allProducts} onChange={() => update({ allProducts: true })} className="accent-emerald-600" />
                All products
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="scope" checked={!form.allProducts} onChange={() => update({ allProducts: false })} className="accent-emerald-600" />
                Specific products / categories
              </label>
            </div>
            {!form.allProducts && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Products</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products (min 2 chars)…"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                  {productLoading && <Loader2 className="mt-1 h-4 w-4 animate-spin text-slate-400" />}
                  {productSearch.trim().length >= 2 && productResults.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                      {productResults.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => addProduct(p.id)}
                            disabled={form.productIds.includes(p.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                          >
                            <span>{p.name}</span>
                            <span className="text-xs text-slate-400">{p.id}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {form.productIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {form.productIds.map((id) => (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {id}
                          <button type="button" onClick={() => removeProduct(id)} className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-400">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Category ids (comma separated)</label>
                  <input
                    value={form.categoryIds.join(", ")}
                    onChange={(e) =>
                      update({
                        categoryIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="cat-dairy, cat-fruits"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Fee type</label>
              <select
                value={form.feeType}
                onChange={(e) => update({ feeType: e.target.value as "flat" | "free_over_threshold" })}
                className={inputClass}
              >
                <option value="flat">Flat fee</option>
                <option value="free_over_threshold">Free over amount</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                {form.feeType === "free_over_threshold" ? "Minimum order amount (₹)" : "Fee amount (₹, 0 = free)"}
              </label>
              {form.feeType === "flat" ? (
                <input value={form.amount} onChange={(e) => update({ amount: e.target.value })} inputMode="numeric" className={inputClass} />
              ) : (
                <input value={form.minOrderAmount} onChange={(e) => update({ minOrderAmount: e.target.value })} inputMode="numeric" className={inputClass} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Priority (higher wins)</label>
              <input value={form.priority} onChange={(e) => update({ priority: e.target.value })} inputMode="numeric" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Applies to users</label>
              <select value={form.userType} onChange={(e) => update({ userType: e.target.value as "all" | "new" | "existing" })} className={inputClass}>
                <option value="all">All users</option>
                <option value="new">New users (first order)</option>
                <option value="existing">Existing users</option>
              </select>
            </div>
          </div>

          {form.userType === "existing" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Minimum prior orders</label>
              <input value={form.minimumOrders} onChange={(e) => update({ minimumOrders: e.target.value })} inputMode="numeric" className={inputClass} />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Delivery slots (unchecked = all slots)</label>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_SLOT_OPTIONS.map((slot) => (
                <label key={slot} className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.deliverySlots.includes(slot)} onChange={() => toggleSlot(slot)} className="accent-emerald-600" />
                  {slot}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Starts at</label>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => update({ startsAt: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Ends at</label>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => update({ endsAt: e.target.value })} className={inputClass} />
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : editing ? "Save changes" : "Create rule"}
          </button>
        </div>
      </div>
    </div>
  );
}