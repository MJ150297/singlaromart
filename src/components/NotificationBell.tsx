"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Bell, CheckCheck, Package } from "lucide-react";

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: { items: AppNotification[]; unreadCount: number };
  error?: string;
}

const NOTIFICATIONS_URL = "/api/notifications?limit=10";

async function fetchNotifications(): Promise<NotificationsResponse["data"]> {
  const res = await fetch(NOTIFICATIONS_URL);
  const body = (await res.json()) as NotificationsResponse;
  if (!res.ok || !body.success) {
    throw new Error(body.error || "Failed to load notifications");
  }
  return body.data;
}

/** Small relative-time helper (e.g. "2h ago"). */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}

/**
 * Notification bell with unread badge + dropdown, shown in the storefront
 * header. Polls the notifications API while mounted and marks everything read
 * as soon as the dropdown opens. Only renders for authenticated users.
 */
export function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    data,
    mutate,
    isLoading,
    error: loadError,
  } = useSWR(status === "authenticated" ? NOTIFICATIONS_URL : null, fetchNotifications, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  // Close dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Mark everything read as soon as the dropdown opens.
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    let cancelled = false;
    (async () => {
      try {
        await fetch("/api/notifications", { method: "PATCH" });
        if (!cancelled) {
          await mutate(
            (current) => ({
              items: (current?.items ?? []).map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            }),
            { optimisticData: {
              items: (data?.items ?? []).map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            } }
          );
        }
      } catch {
        // Non-fatal: polling will refresh again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, unreadCount, mutate, data]);

  if (status !== "authenticated") return null;

  async function markAllRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      await mutate(
        (current) => ({
          items: (current?.items ?? []).map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }),
        { revalidate: false }
      );
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-8 text-center text-xs text-slate-500">
                Loading notifications…
              </p>
            )}
            {!isLoading && loadError && (
              <p className="px-4 py-8 text-center text-xs text-rose-500">
                Unable to load notifications.
              </p>
            )}
            {!isLoading && !loadError && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500">No notifications yet</p>
              </div>
            )}
{items.map((notification) => (
              <Link
                key={notification.id}
                href={notification.link || "/account"}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    notification.type === "order"
                      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  }`}
                >
                  <Package className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {notification.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {timeAgo(notification.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {notification.message}
                  </span>
                </span>
                {!notification.read && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}