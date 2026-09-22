"use client";

import { useEffect } from "react";

export function InstallPrompt() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Baseline PWA registration should not block page rendering.
    });
  }, []);

  return null;
}
