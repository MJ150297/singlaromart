"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ui";
import { fetchApi } from "@/lib/swr";
import type { CloudinaryImage } from "@/lib/schemas";

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image: string | CloudinaryImage;
  order: number;
  isActive: boolean;
}

interface BannerForm {
  id?: string;
  title: string;
  subtitle: string;
  badge: string;
  gradient: string;
  cta: string;
  image: string | CloudinaryImage;
  order: number;
  isActive: boolean;
}

const emptyForm: BannerForm = {
  title: "",
  subtitle: "",
  badge: "",
  gradient: "from-emerald-500 to-teal-600",
  cta: "",
  image: "",
  order: 0,
  isActive: true,
};

export default function BannersClient({ initialBanners }: { initialBanners: Banner[] }) {
  const { data, error, mutate } = useSWR<Banner[]>('/admin/banners', () => fetchApi<Banner[]>('/admin/banners').then((arr) => arr ?? []), { fallbackData: initialBanners });
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");

  const banners = data || [];
  const isLoading = !data && !error;

  function openCreateForm() {
    setEditingBanner(null);
    setForm({ ...emptyForm, order: banners.length });
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
      order: banner.order || 0,
      isActive: banner.isActive ?? true,
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
      order: Number(form.order),
      image: typeof form.image === "string" ? form.image.trim() || undefined : form.image,
    };

    try {
      const url = editingBanner ? `/api/admin/banners/${editingBanner.id}` : "/api/admin/banners";
      const method = editingBanner ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || "Failed to save banner");
        setSaving(false);
        return;
      }

      if (data.warnings?.length) {
        setWarning(data.warnings.join(" "));
      } else {
        setWarning("");
      }

      setShowForm(false);
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to save banner");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      const res = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
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

  async function toggleActive(banner: Banner) {
    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });
      const data = await res.json();
      if (data.success) await mutate();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Banners</h1>
          <p className="text-sm text-slate-500 mt-1">Manage hero carousel banners</p>
        </div>
        <button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Banner
        </button>
      </div>

      {errorMsg && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">{errorMsg}</div>}
      {warning && <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">{warning}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingBanner ? "Edit Banner" : "Add Banner"}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Fresh Groceries Delivered" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subtitle</label>
                  <input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Order before 10 AM for same-day delivery" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Badge</label>
                    <input type="text" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="e.g. NEW" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">CTA Text</label>
                    <input type="text" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="e.g. Shop Now" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gradient</label>
                  <select value={form.gradient} onChange={(e) => setForm({ ...form, gradient: e.target.value })} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100">
                    <option value="from-emerald-500 to-teal-600">Emerald → Teal</option>
                    <option value="from-orange-500 to-rose-600">Orange → Rose</option>
                    <option value="from-blue-500 to-indigo-600">Blue → Indigo</option>
                    <option value="from-purple-500 to-pink-600">Purple → Pink</option>
                    <option value="from-amber-500 to-orange-600">Amber → Orange</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Banner Image</label>
                  <ImageUpload value={form.image} label="Upload banner image" folder="banners" onUpload={(image) => setForm({ ...form, image })} onError={(message) => setErrorMsg(message)} />
                  <p className="text-xs text-slate-400 mt-2">You can also paste a direct image URL below.</p>
                  <input type="text" value={typeof form.image === "string" ? form.image : ""} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="/images/banner.jpg" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Order</label>
                    <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} min="0" className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100" />
                  </div>

                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                      Active
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">{saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : ("Save Banner")}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><p className="text-lg font-medium">No banners found</p><p className="text-sm mt-1">Add your first banner to get started</p></div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-12 rounded-lg bg-gradient-to-r ${banner.gradient || "from-emerald-500 to-teal-600"} flex items-center justify-center text-white text-xs font-bold shrink-0`}>{banner.badge || "Banner"}</div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{banner.title}</h3>
                    <p className="text-xs text-slate-500">{banner.subtitle || "No subtitle"} · Order: {banner.order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(banner)} className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${banner.isActive ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>{banner.isActive ? "Active" : "Inactive"}</button>
                  <button onClick={() => openEditForm(banner)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(banner.id)} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
