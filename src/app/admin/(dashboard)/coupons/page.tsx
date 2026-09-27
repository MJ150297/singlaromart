"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Plus, TicketPercent } from "lucide-react";
import { fetchRaw } from "@/lib/swr";

interface Coupon {
  id: string;
  code: string;
  name: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  usageCount: number;
  usageLimit?: number;
  isActive: boolean;
}

interface CouponResponse { items: Coupon[]; total: number; }

export default function AdminCouponsPage() {
  const { data, mutate } = useSWR<{ success: boolean; data: CouponResponse }>("/admin/coupons?limit=100", fetchRaw);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", discountType: "percentage", discountValue: "", minimumOrderAmount: "" });
  const coupons = data?.data?.items ?? [];

  async function createCoupon(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
          minimumOrderAmount: Number(form.minimumOrderAmount || 0),
        }),
      });
      if (!response.ok) throw new Error("Unable to create coupon");
      setForm({ code: "", name: "", discountType: "percentage", discountValue: "", minimumOrderAmount: "" });
      setShowForm(false);
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    await mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Coupons</h1><p className="mt-1 text-sm text-slate-500">Create and control single-use promotional codes.</p></div>
        <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New coupon</button>
      </div>
      {showForm && <form onSubmit={createCoupon} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <input required placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="rounded-lg border p-2 text-sm dark:bg-slate-800" />
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border p-2 text-sm dark:bg-slate-800" />
        <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="rounded-lg border p-2 text-sm dark:bg-slate-800"><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option></select>
        <input required type="number" min="0" step="0.01" placeholder="Discount value" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="rounded-lg border p-2 text-sm dark:bg-slate-800" />
        <input type="number" min="0" step="0.01" placeholder="Minimum order amount" value={form.minimumOrderAmount} onChange={(e) => setForm({ ...form, minimumOrderAmount: e.target.value })} className="rounded-lg border p-2 text-sm dark:bg-slate-800" />
        <button disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create coupon"}</button>
      </form>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="p-4">Code</th><th className="p-4">Discount</th><th className="p-4">Usage</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{coupons.map((coupon) => <tr key={coupon.id} className="border-b last:border-0"><td className="p-4 font-mono font-semibold"><span className="inline-flex items-center gap-2"><TicketPercent className="h-4 w-4 text-emerald-600" />{coupon.code}</span><div className="text-xs font-normal text-slate-500">{coupon.name}</div></td><td className="p-4">{coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}</td><td className="p-4">{coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</td><td className="p-4"><span className={coupon.isActive ? "text-emerald-600" : "text-slate-500"}>{coupon.isActive ? "Active" : "Inactive"}</span></td><td className="p-4"><button onClick={() => toggleCoupon(coupon)} className="text-xs font-semibold text-emerald-600">{coupon.isActive ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table>{coupons.length === 0 && <p className="p-10 text-center text-sm text-slate-500">No coupons created yet.</p>}</div>
    </div>
  );
}
