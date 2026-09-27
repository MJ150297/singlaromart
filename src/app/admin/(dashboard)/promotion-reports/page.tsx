"use client";

import useSWR from "swr";
import { Download } from "lucide-react";
import { fetchRaw } from "@/lib/swr";

interface ReportSummary {
  orders: number;
  couponRedemptionRate: number;
  referralConversionRate: number;
  netCreditFlow: number;
  totalDiscountRate: number;
  refundRate: number;
}

export default function PromotionReportsPage() {
  const { data } = useSWR<{ success: boolean; data: ReportSummary }>('/admin/promotion-reports', fetchRaw);
  const summary = data?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Promotion reports</h1>
          <p className="mt-1 text-sm text-slate-500">Track execution quality, promotion efficiency, and credit movement.</p>
        </div>
        <a href="/api/admin/promotion-reports/export" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summary ? (
          <>
            <StatCard label="Orders" value={String(summary.orders)} />
            <StatCard label="Coupon redemption rate" value={`${summary.couponRedemptionRate}%`} />
            <StatCard label="Referral conversion rate" value={`${summary.referralConversionRate}%`} />
            <StatCard label="Net credit flow" value={`₹${summary.netCreditFlow}`} />
            <StatCard label="Discount rate" value={`${summary.totalDiscountRate}%`} />
            <StatCard label="Refund rate" value={`${summary.refundRate}%`} />
          </>
        ) : (
          <p className="text-sm text-slate-500">Loading promotion metrics…</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
