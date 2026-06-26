"use client";

import { useEffect } from "react";

/** Registers the PWA service worker on the client (no-op if unsupported). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
