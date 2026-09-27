"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Loader2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useToast } from "@/components/ui/toast";
import { site } from "@/lib/site";

const PROMPT_STORAGE_KEY = `${site.storageKeyPrefix}-push-prompt-seen`;

/**
 * First-visit push opt-in prompt. The native permission dialog is opened only
 * after the user clicks Enable, as browsers reject unsolicited page-load asks.
 */
export function PushNotificationPrompt() {
  const { status } = useSession();
  const { supported, isSubscribed, busy, error, subscribe } = usePushSubscription();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || supported !== "supported" || isSubscribed !== false) {
      return;
    }

    const seen = window.localStorage.getItem(PROMPT_STORAGE_KEY);
    if (!seen) {
      void Promise.resolve().then(() => setVisible(true));
    }
  }, [status, supported, isSubscribed]);

  function dismiss() {
    window.localStorage.setItem(PROMPT_STORAGE_KEY, "1");
    setVisible(false);
  }

  async function enable() {
    const ok = await subscribe();
    if (ok) {
      window.localStorage.setItem(PROMPT_STORAGE_KEY, "1");
      setVisible(false);
      toast.success("Push notifications turned on");
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/30 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-prompt-title"
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close notification prompt"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <BellRing className="h-6 w-6" />
        </div>
        <h2 id="push-prompt-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Stay updated on your order
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Get an instant notification when your order is confirmed, out for delivery, delivered, or cancelled.
        </p>
        {error && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}
