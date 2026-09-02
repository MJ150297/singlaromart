"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, Shield, Smartphone } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useToast } from "@/components/ui/toast";

/**
 * Push notification settings panel, rendered inside the customer account page.
 * Lets the user enable/disable Web Push for order updates.
 */
export function NotificationSettings() {
  const { supported, permission, isSubscribed, busy, error, subscribe, unsubscribe } =
    usePushSubscription();
  const { toast } = useToast();
  const [inFlight, setInFlight] = useState(false);

  const enabled = isSubscribed === true;

  async function handleToggle() {
    if (inFlight) return;
    setInFlight(true);
    try {
      if (enabled) {
        const ok = await unsubscribe();
        if (ok) {
          toast.success("Push notifications turned off");
        } else {
          toast.error(error || "Could not turn off notifications");
        }
      } else {
        const ok = await subscribe();
        if (ok) {
          toast.success("Push notifications turned on");
        } else {
          toast.error(error || "Could not turn on notifications");
        }
      }
    } finally {
      setInFlight(false);
    }
  }

  const showDeniedHint =
    supported === "supported" && permission === "denied" && !enabled;

  return (
    <section
      id="settings"
      className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      aria-labelledby="notification-settings-heading"
    >
      <h2
        id="notification-settings-heading"
        className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100"
      >
        <Bell className="h-5 w-5 text-emerald-600" />
        Notifications
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Get notified instantly when your order status changes.
      </p>

      {supported === "supported" ? (
        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Shield className="h-5 w-5 text-emerald-600" />
            ) : (
              <BellOff className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {enabled ? "Enabled" : "Off"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {enabled
                  ? "Order updates will appear as browser notifications."
                  : "Turn on to receive order status updates instantly."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={busy || inFlight}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {(busy || inFlight) && <Loader2 className="h-4 w-4 animate-spin" />}
            {enabled ? "Turn off" : "Turn on"}
          </button>
        </div>
      ) : (
        <div className="mt-4 p-4 text-sm text-slate-500 rounded-lg bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
          <Smartphone className="h-4 w-4 shrink-0" />
          Browser notifications are not supported in this browser.
        </div>
      )}

      {showDeniedHint && (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          Notification permission was previously blocked. Allow notifications
          for this site in your browser settings, then try again.
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </section>
  );
}