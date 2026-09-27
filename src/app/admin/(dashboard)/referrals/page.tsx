"use client";

import useSWR from "swr";
import { fetchRaw } from "@/lib/swr";

interface ReferralOverview {
  programs: Array<{ id: string; name: string; slug: string; isActive: boolean; referrerRewardAmount: number; referredBenefitAmount: number }>;
  attributions: Array<{ _id: string; programId: string; referrerUserId: string; referredUserId: string; fraudStatus: string; qualifiedAt?: string; createdAt: string }>;
  rewards: Array<{ _id: string; programId: string; rewardAmount: number; status: string; createdAt: string }>;
}

export default function ReferralsPage() {
  const { data } = useSWR<{ success: boolean; data: ReferralOverview }>('/admin/referrals', fetchRaw);
  const programs = data?.data?.programs ?? [];
  const attributions = data?.data?.attributions ?? [];
  const rewards = data?.data?.rewards ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="mt-1 text-sm text-slate-500">Review active programs, referral attribution health, and bonus payouts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Programs</div>
          <div className="mt-2 text-2xl font-bold">{programs.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Attributions</div>
          <div className="mt-2 text-2xl font-bold">{attributions.length}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500">Rewards issued</div>
          <div className="mt-2 text-2xl font-bold">{rewards.length}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-slate-500">
            <tr>
              <th className="p-4">Program</th>
              <th className="p-4">Referrer</th>
              <th className="p-4">Referred</th>
              <th className="p-4">Status</th>
              <th className="p-4">Reward</th>
            </tr>
          </thead>
          <tbody>
            {attributions.map((item) => (
              <tr key={item._id} className="border-b last:border-0">
                <td className="p-4 font-mono text-xs">{item.programId}</td>
                <td className="p-4">{item.referrerUserId}</td>
                <td className="p-4">{item.referredUserId}</td>
                <td className="p-4 uppercase">{item.fraudStatus}</td>
                <td className="p-4">₹{rewards.find((reward) => reward.programId === item.programId)?.rewardAmount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
