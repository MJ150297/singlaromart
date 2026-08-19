"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA installability and offline support.
 */
export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Only register in production to avoid dev caching issues
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker
          .register("/sw.js", {
            scope: "/",
            updateViaCache: "none",
          })
          .then((registration) => {
            console.log(
              "[PWA] Service worker registered:",
              registration.scope
            );
          })
          .catch((error) => {
            console.error("[PWA] Service worker registration failed:", error);
          });
      }
    }
  }, []);

  return null;
}