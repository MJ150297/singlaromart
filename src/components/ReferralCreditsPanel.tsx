"use client";

import useSWR from "swr";
import { Copy, Gift, Wallet } from "lucide-react";

interface ReferralData { code: string | null; link: string | null; creditBalance: number; attributions: Array<{ referredUserId: string; qualifiedAt?: string }>; rewards: Array<{ rewardAmount: number; status: string }> }
const fetcher = async (url: string) => { const response = await fetch(url); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.error || "Unable to load referrals"); return body.data as ReferralData; };

export function ReferralCreditsPanel() {
  const { data, isLoading } = useSWR<ReferralData>("/api/referrals/me", fetcher);
  if (isLoading) return <section className="h-32 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />;
  if (!data) return null;
  const copy = async () => { if (data.link) await navigator.clipboard.writeText(`${window.location.origin}${data.link}`); };
  return <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><Gift className="h-5 w-5 text-emerald-600" /> Referrals & credits</h2><p className="mt-1 text-xs text-slate-500">Share your link and earn store credit after a successful first order.</p></div><div className="flex items-center gap-2 text-emerald-600"><Wallet className="h-5 w-5" /><strong>₹{data.creditBalance}</strong></div></div>
    {data.code && <div className="mt-4 flex flex-wrap items-center gap-2"><code className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{data.code}</code><button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Copy link</button></div>}
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-500">Referrals</p><p className="font-semibold">{data.attributions.length}</p></div><div><p className="text-xs text-slate-500">Rewards issued</p><p className="font-semibold">{data.rewards.filter((reward) => reward.status === "awarded").length}</p></div></div>
  </section>;
}
