"use client";

import { useState } from "react";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import { BreakdownCharts, DashboardSkeleton, DashboardStats, LowStock, RecentOrders, RevenueTrendChart, StatCards } from "./dashboard-components";

type Range = 7 | 30;
type ApiResponse = { success: boolean; data?: DashboardStats; error?: string };

const fetcher = async (url: string): Promise<DashboardStats> => {
  const response = await fetch(url);
  const payload = await response.json() as ApiResponse;
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || "Failed to load dashboard");
  return payload.data;
};

export default function AdminDashboardPage() {
  const [range, setRange] = useState<Range>(7);
  const { data: stats, error, isLoading, mutate } = useSWR<DashboardStats>(`/api/admin/stats?range=${range}`, fetcher, { revalidateOnFocus: true });

  if (isLoading) return <DashboardSkeleton />;
  if (error || !stats) return <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center"><p className="text-sm text-rose-600">{error?.message || "Failed to load dashboard"}</p><button type="button" onClick={() => mutate()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700"><RefreshCw className="h-4 w-4" /> Retry</button></div>;

  return <div className="space-y-6"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Overview of your store&apos;s performance</p></div><StatCards stats={stats} /><div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><RevenueTrendChart data={stats.selectedTimeSeries} range={range} onRangeChange={setRange} /><RecentOrders orders={stats.recentOrders} /></div><BreakdownCharts stats={stats} /><LowStock products={stats.lowStockProducts} /></div>;
}
