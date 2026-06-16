"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile captcha widget.
 *
 * Setup (production):
 *   1. Sign up at https://www.cloudflare.com/products/turnstile/
 *   2. Get Site Key + Secret Key from Cloudflare dashboard
 *   3. Add to .env:
 *        NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
 *        TURNSTILE_SECRET_KEY=0x4AAAAAAA...
 *   4. In dev with no keys, this component renders nothing and `getToken()` returns null.
 *
 * Usage:
 *   <TurnstileCaptcha onToken={(token) => setCaptchaToken(token)} />
 *   // token is null if no site key configured
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileCaptchaProps {
  /** Callback receives the token, or null if captcha is disabled / not yet solved */
  onToken: (token: string | null) => void;
  /** Optional theme override */
  theme?: "light" | "dark" | "auto";
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function TurnstileCaptcha({ onToken, theme = "dark" }: TurnstileCaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      // No site key — captcha disabled
      onToken(null);
      return;
    }

    if (typeof window === "undefined") return;

    // Load Turnstile script if not present
    if (!window.turnstile) {
      const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
      if (existing) {
        // Script tag exists, wait for it
        existing.addEventListener("load", () => setReady(true));
        return;
      }
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => setReady(true);
      script.onerror = () => console.error("[Turnstile] Failed to load script");
      document.head.appendChild(script);
    } else {
      setReady(true);
    }
  }, [siteKey, onToken]);

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return; // Already rendered

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [ready, siteKey, theme, onToken]);

  // If no site key, render nothing
  if (!siteKey) return null;

  return <div ref={containerRef} className="cf-turnstile" />;
}
