"use client";

import useSWR from "swr";
import { ShieldAlert } from "lucide-react";
import { fetchRaw } from "@/lib/swr";

interface AuditEvent {
  eventId: string;
  entityType: string;
  entityId: string;
  eventType: string;
  actor: string;
  status: string;
  severity: string;
  summary: string;
  createdAt: string;
}

export default function AuditEventsPage() {
  const { data } = useSWR<{ success: boolean; data: AuditEvent[] }>("/admin/audit-events", fetchRaw);
  const events = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Promotion audit</h1>
          <p className="mt-1 text-sm text-slate-500">Review coupon, referral, and refund activity for risk and reversal cases.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
          <ShieldAlert className="h-4 w-4" />
          {events.length} events
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs text-slate-500">
            <tr>
              <th className="p-4">Type</th>
              <th className="p-4">Entity</th>
              <th className="p-4">Summary</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actor</th>
              <th className="p-4">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.eventId} className="border-b last:border-0">
                <td className="p-4 font-medium">{event.eventType}</td>
                <td className="p-4 font-mono text-xs">{event.entityType}:{event.entityId}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{event.summary}</td>
                <td className="p-4">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {event.status}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{event.actor}</td>
                <td className="p-4 text-slate-500">{new Date(event.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">No promotion audit events yet.</p>
        )}
      </div>
    </div>
  );
}
