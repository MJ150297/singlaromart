"use client";

import useSWR from "swr";
import { fetchRaw } from "@/lib/swr";

interface Refund { id: string; orderId: string; refundableAmount: number; reason: string; status: string; }
export default function RefundsPage() {
  const { data, mutate } = useSWR<{ success: boolean; data: Refund[] }>("/admin/refunds", fetchRaw);
  async function process(refund: Refund) { await fetch(`/api/admin/refunds/${refund.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "processed" }) }); await mutate(); }
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Refunds</h1><p className="mt-1 text-sm text-slate-500">Review and process promotion reversals.</p></div><div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-slate-500"><tr><th className="p-4">Order</th><th className="p-4">Amount</th><th className="p-4">Reason</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead><tbody>{(data?.data ?? []).map((refund) => <tr key={refund.id} className="border-b last:border-0"><td className="p-4 font-mono">{refund.orderId}</td><td className="p-4">₹{refund.refundableAmount}</td><td className="p-4">{refund.reason}</td><td className="p-4">{refund.status}</td><td className="p-4">{refund.status !== "processed" && <button onClick={() => process(refund)} className="font-semibold text-emerald-600">Process</button>}</td></tr>)}</tbody></table></div></div>;
}