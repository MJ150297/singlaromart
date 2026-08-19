"use client";

import { useState, useEffect } from "react";
import { X, Share, Plus } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

/**
 * Shows an install prompt for iOS devices (which don't support beforeinstallprompt).
 * Also handles the Android beforeinstallprompt event for a custom install button.
 */
export function InstallPrompt() {
  // Detect iOS synchronously (deterministic browser check — lazy init avoids effect)
  const [isIOS] = useState(
    () =>
      typeof window !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as WindowWithMSStream).MSStream
  );

  // Check if already running as standalone PWA (lazy init)
  const [isStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as NavigatorWithStandalone).standalone === true)
  );

  // Check if user has previously dismissed the prompt (lazy init)
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      !!localStorage.getItem("indiyano_install_dismissed")
  );

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Show prompt after a short delay (only if not standalone)
  useEffect(() => {
    if (!isStandalone && !dismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isStandalone, dismissed]);

  // Handle Android beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isStandalone && !dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
  }, [isStandalone, dismissed]);

  // Handle app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem("indiyano_install_dismissed", "true");
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => window.removeEventListener("appinstalled", handleAppInstalled);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        console.log("[PWA] User accepted the install prompt");
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem("indiyano_install_dismissed", "true");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem("indiyano_install_dismissed", "true");
  };

  if (isStandalone || !showPrompt || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-50">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center shrink-0">
              I
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Install Indiyano
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Get the app for a faster shopping experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-medium">
                <Share className="w-3.5 h-3.5" /> Share
              </span>
              button in Safari
            </p>
            <p className="flex items-center gap-2">
              Then tap{" "}
              <span className="flex items-center gap-1 font-medium">
                <Plus className="w-3.5 h-3.5" /> Add to Home Screen
              </span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  );
}