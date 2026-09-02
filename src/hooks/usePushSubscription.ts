"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Client-side Web Push lifecycle hook.
 *
 * Handles the browser Notification permission flow, push subscription
 * (subscribe/unsubscribe) and keeps the server-side subscription in sync.
 */

/** Convert a URL-safe base64 VAPID public key to an ArrayBuffer. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export type PushSupport = "unsupported" | "supported";
export type PushPermissionState = NotificationPermission | "default";

interface UsePushSubscriptionResult {
  /** Whether the browser supports the Web Push APIs at all. */
  supported: PushSupport;
  /** Current Notification permission. */
  permission: PushPermissionState;
  /** True once the browser confirms an active subscription exists. */
  isSubscribed: boolean | null;
  /** True while a subscribe/unsubscribe request is in flight. */
  busy: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Subscribe for push notifications (requests permission if needed). */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe and remove the server-side record. */
  unsubscribe: () => Promise<boolean>;
}

/** True when the Web Push APIs are available in the current browser. */
function isBrowserSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const { status } = useSession();
  // Feature-support and permission are derived once from the environment via
  // lazy initializers so we never call setState synchronously from an effect.
  const [supported] = useState<PushSupport>(() =>
    isBrowserSupported() ? "supported" : "unsupported"
  );
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    isBrowserSupported() ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Stable placeholder so the API shape stays the same for callers.
  const isSupported = useCallback(() => isBrowserSupported(), []);

  // Reflect the server-side subscription state when a user signs in/out.
  useEffect(() => {
    if (status !== "authenticated" || !isSupported()) {
      // Reset asynchronously (setState inside a callback, not the effect body).
      void Promise.resolve().then(() => {
        if (mounted.current) setIsSubscribed(null);
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/push/subscribe");
        const body = (await res.json()) as { success: boolean; data?: { subscribed: boolean } };
        if (!cancelled) setIsSubscribed(body.success ? Boolean(body.data?.subscribed) : null);
      } catch {
        if (!cancelled) setIsSubscribed(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, isSupported]);

  const getLocalSubscription = useCallback(async () => {
    if (!isSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      setError("Push notifications are not supported by this browser.");
      return false;
    }
    if (status !== "authenticated") {
      setError("Please sign in to enable push notifications.");
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      // 1. Ensure permission
      let currentPermission = Notification.permission;
      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission);
      }
      if (currentPermission !== "granted") {
        setError("Notification permission was denied. Enable it in your browser settings and try again.");
        return false;
      }

      // 2. Get the VAPID public key
      const keyRes = await fetch("/api/push/vapid-key");
      const keyBody = (await keyRes.json()) as {
        success: boolean;
        data?: { publicKey: string };
        error?: string;
      };
      if (!keyRes.ok || !keyBody.success || !keyBody.data?.publicKey) {
        setError(keyBody.error || "Push notifications are not configured on the server yet.");
        return false;
      }

      // 3. Ensure the service worker is registered (dev doesn't register it globally)
      await (navigator.serviceWorker.getRegistration("/") ||
        navigator.serviceWorker.register("/sw.js", { scope: "/" }));

      // register() may resolve while the worker is still installing. PushManager
      // requires an active worker, so wait for the browser's ready registration
      // before reading or creating the subscription.
      const activeRegistration = await navigator.serviceWorker.ready;

      // 4. Create (or reuse) the browser subscription
      let subscription = await activeRegistration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await activeRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyBody.data.publicKey).buffer,
        });
      }

      // 5. Persist on the server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: subscription.toJSON().keys,
          userAgent: navigator.userAgent,
        }),
      });
      const body = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !body.success) {
        setError(body.error || "Failed to save push subscription.");
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("[push] subscribe failed:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [isSupported, status]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return true;

    setBusy(true);
    setError(null);
    try {
      const subscription = await getLocalSubscription();
      const endpoint = subscription?.endpoint;
      if (subscription) {
        await subscription.unsubscribe();
      }
      if (endpoint) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error("[push] unsubscribe failed:", err);
      setError(err instanceof Error ? err.message : "Failed to unsubscribe.");
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [getLocalSubscription, isSupported]);

  return { supported, permission, isSubscribed, busy, error, subscribe, unsubscribe };
}
