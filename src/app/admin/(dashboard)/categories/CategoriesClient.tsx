"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ui";
import { fetchApi } from "@/lib/swr";
import type { CloudinaryImage } from "@/lib/schemas";

interface Subcategory {
  id?: string;
  name: string;
  slug?: string;
  image: string | CloudinaryImage;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  image: string | CloudinaryImage;
  subcategories: Subcategory[];
}

interface SubcategoryForm {
  id?: string;
  name: string;
  slug?: string;
  image: string | CloudinaryImage;
}

interface CategoryForm {
  id?: string;
  name: string;
  icon: string;
  image: string | CloudinaryImage;
  subcategories: SubcategoryForm[];
}

const emptySubcategory = (): SubcategoryForm => ({ name: "", image: "" });

const emptyForm = (): CategoryForm => ({ name: "", icon: "", image: "", subcategories: [] });

function imageUrl(img?: string | CloudinaryImage): string {
  if (!img) return "";
  if (typeof img === "string") return img;
  return (img.secureUrl as string) || (img.url as string) || ((img as CloudinaryImage).transformations?.card as string) || "";
}

export default function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const { data, error, mutate } = useSWR<Category[]>('/admin/categories', () => fetchApi<Category[]>('/admin/categories').then((arr) => arr ?? []), { fallbackData: initialCategories });
  const [categories, setCategories] = useState<Category[]>(data || []);
  const [isLoading] = useState(!data && !error);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warning, setWarning] = useState("");

  function patchForm(patch: Partial<CategoryForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

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
      icon: category.icon || "",
      image: category.image || "",
      subcategories: (category.subcategories || []).map((s) => ({ id: s.id || "", name: s.name, slug: s.slug || "", image: s.image || "" })),
    });
    setShowForm(true);
    setErrorMsg("");
  }

  // Subcategories
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
      subcategories: form.subcategories
        .filter((s) => s.name.trim() !== "")
        .map((s) => ({ id: s.id?.trim() || undefined, name: s.name.trim(), slug: typeof s.slug === 'string' ? s.slug.trim() || undefined : undefined, image: typeof s.image === 'string' ? s.image.trim() || undefined : s.image })),
    };

    try {
      const url = editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || 'Failed to save category');
        setSaving(false);
        return;
      }

      if (data.warnings?.length) setWarning(data.warnings.join(' '));
      else setWarning('');

      setShowForm(false);
      await mutate();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (data.warnings?.length) setWarning(data.warnings.join(' '));
        else setWarning('');
        await mutate();
      }
    } catch (err) {
      console.error(err);
    }
  }

  const inputClass = 'w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  const list = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product categories and subcategories</p>
        </div>
        <button onClick={openCreateForm} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"><Plus className="w-4 h-4" /> Add Category</button>
      </div>

      {errorMsg && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-600 dark:text-rose-400">{errorMsg}</div>}
      {warning && <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-400">{warning}</div>}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={labelClass}>Category Name *</label>
                  <input type="text" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} required placeholder="e.g. Staples, Spices" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Icon (emoji)</label>
                  <input type="text" value={form.icon} onChange={(e) => patchForm({ icon: e.target.value })} placeholder="🍚" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Category Image</label>
                  <ImageUpload value={form.image} label="Upload category image" folder="categories" onUpload={(image) => patchForm({ image })} onError={(message) => setErrorMsg(message)} />
                  <p className="text-xs text-slate-400 mt-2">You can also paste a direct image URL below.</p>
                  <input type="text" value={typeof form.image === 'string' ? form.image : ''} onChange={(e) => patchForm({ image: e.target.value })} placeholder="/images/category.jpg" className={inputClass} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Subcategories</label>
                    <button type="button" onClick={addSubcategory} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Subcategory</button>
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
                            <input type="text" value={sub.slug || ''} onChange={(e) => updateSubcategory(index, { slug: e.target.value })} placeholder="Slug (e.g. milk)" className={inputClass} />
                          </div>
                          <div className="flex-1">
                            <ImageUpload value={sub.image} label="Upload subcategory image" folder="subcategories" onUpload={(image) => updateSubcategory(index, { image })} onError={(message) => setErrorMsg(message)} />
                            <input type="text" value={typeof sub.image === 'string' ? sub.image : ''} onChange={(e) => updateSubcategory(index, { image: e.target.value })} placeholder="Image URL" className={inputClass} />
                          </div>
                          <button type="button" onClick={() => removeSubcategory(index)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">{saving ? (<><Loader2 className="w-4 h-4 animate-spin" />Saving...</>) : ('Save Category')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-slate-400"><p className="text-lg font-medium">No categories found</p><p className="text-sm mt-1">Add your first category to get started</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((category) => (
            <div key={category.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {imageUrl(category.image) ? (
                    <div className="w-10 h-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(category.image)} alt={category.name} className="w-full h-full object-cover" onError={(e) => {(e.target as HTMLImageElement).style.display = 'none';}} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">{category.icon || '📦'}</div>
                  )}
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{category.name}</h3>
                    <p className="text-xs text-slate-500">{category.subcategories?.length || 0} subcategories</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditForm(category)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(category.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {category.subcategories && category.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {category.subcategories.map((sub) => (
                    <span key={sub.name} className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">{sub.name}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
