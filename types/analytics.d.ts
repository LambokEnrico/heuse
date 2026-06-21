// ============================================
// GLOBAL WINDOW TYPES — Analytics scripts
// ============================================
// These globals are injected at runtime by Google Analytics (gtag.js)
// and Meta Pixel (fbevents.js). We declare them so TypeScript doesn't
// complain when we call window.gtag(...) or window.fbq(...).
//
// Runtime guards in components/analytics.tsx ensure these exist
// before calling them — but the type declarations let TS verify
// the call signatures are correct.
//
// Usage:
//   if (typeof window.gtag === "function") {
//     window.gtag("event", "purchase", { value: 100 });
//   }

export {};

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (
      command: "config" | "event" | "js" | "set" | "consent",
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    fbq: (
      command: "init" | "track" | "trackCustom" | "consent" | "pixelLoaded",
      eventName: string,
      params?: Record<string, unknown>
    ) => void;
    _fbq: typeof Window.prototype.fbq;
  }
}