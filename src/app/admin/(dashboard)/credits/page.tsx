"use client";

import { useState } from "react";
import useSWR from "swr";
import { Wallet } from "lucide-react";
import { fetchRaw } from "@/lib/swr";

interface CreditUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance: number;
}

export default function CreditsPage() {
  const { data } = useSWR<{ success: boolean; data: CreditUser[] }>('/admin/credits', fetchRaw);
  const users = data?.data ?? [];
  const [adjustingUser, setAdjustingUser] = useState<CreditUser | null>(null);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("Manual adjustment");

  async function submit() {
    if (!adjustingUser) return;
    await fetch(`/api/admin/credits/${adjustingUser.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: Number(delta), reason }),
    });
    setAdjustingUser(null);
    setDelta("0");
    setReason("Manual adjustment");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="mt-1 text-sm text-slate-500">Review active store-credit balances and apply manual adjustments.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-slate-500">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Balance</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </td>
                <td className="p-4 text-slate-600">{user.phone || "—"}</td>
                <td className="p-4 font-semibold text-emerald-600">₹{user.creditBalance}</td>
                <td className="p-4">
                  <button onClick={() => setAdjustingUser(user)} className="rounded-lg border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-600">Adjust</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjustingUser && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-emerald-600">
            <Wallet className="h-4 w-4" />
            <span className="font-semibold">Adjust credit for {adjustingUser.name}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input type="number" step="0.01" value={delta} onChange={(e) => setDelta(e.target.value)} className="rounded-lg border p-2 text-sm dark:bg-slate-800" placeholder="Delta value" />
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border p-2 text-sm dark:bg-slate-800" placeholder="Reason" />
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={submit} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
            <button onClick={() => setAdjustingUser(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
