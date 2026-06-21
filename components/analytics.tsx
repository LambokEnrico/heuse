"use client";

/**
 * Analytics — page view tracking on route change.
 *
 * The actual <script> tags are injected directly in app/layout.tsx via
 * dangerouslySetInnerHTML (NOT through next/script), which guarantees
 * execution at HTML parse time. This is more reliable than
 * next/script's afterInteractive strategy, which had hydration issues
 * with our Suspense + useSearchParams setup.
 *
 * The script tags define window.gtag and window.fbq. This component
 * fires page_view events on route changes (SPA navigation).
 *
 * Env vars (set in Railway):
 *   - NEXT_PUBLIC_GA_ID (e.g. "G-XXXXXXXXXX")
 *   - NEXT_PUBLIC_META_PIXEL_ID (15-16 digit numeric)
 */

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

// ============================================================
// PAGE VIEW TRACKING (route changes)
// ============================================================

interface PageViewTrackerProps {
  gaId?: string;
  pixelId?: string;
}

function PageViewTrackerInner({ gaId, pixelId }: PageViewTrackerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url =
      pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // GA4: page_view
    if (gaId && typeof window.gtag === "function") {
      window.gtag("config", gaId, { page_path: url });
    }

    // Meta Pixel: PageView (in addition to the one fired by the init script)
    if (pixelId && typeof window.fbq === "function") {
      window.fbq("track", "PageView");
    }
  }, [pathname, searchParams, gaId, pixelId]);

  return null;
}

export function PageViewTracker({ gaId, pixelId }: PageViewTrackerProps) {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner gaId={gaId} pixelId={pixelId} />
    </Suspense>
  );
}

// ============================================================
// PURCHASE EVENT (success page)
// ============================================================

export interface PurchaseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PurchaseData {
  orderNumber: string;
  total: number;
  currency?: string;
  items: PurchaseItem[];
}

interface TrackPurchaseProps {
  /** Set to true ONLY when the order is actually PAID. */
  shouldFire: boolean;
  data: PurchaseData;
  gaId?: string;
  pixelId?: string;
}

/**
 * Fires a `purchase` event to both GA4 and Meta Pixel when the order is
 * successfully paid. Renders nothing.
 *
 * Mount on the success page with shouldFire={order.paymentStatus === "PAID"}.
 */
export function TrackPurchase({
  shouldFire,
  data,
  gaId,
  pixelId,
}: TrackPurchaseProps) {
  useEffect(() => {
    if (!shouldFire) return;

    // GA4: purchase event
    if (gaId && typeof window.gtag === "function") {
      window.gtag("event", "purchase", {
        transaction_id: data.orderNumber,
        value: data.total,
        currency: data.currency || "IDR",
        items: data.items.map((it) => ({
          item_id: it.id,
          item_name: it.name,
          price: it.price,
          quantity: it.quantity,
        })),
      });
    }

    // Meta Pixel: Purchase event (standard ecommerce event)
    if (pixelId && typeof window.fbq === "function") {
      window.fbq("track", "Purchase", {
        content_ids: data.items.map((it) => it.id),
        content_type: "product",
        value: data.total,
        currency: data.currency || "IDR",
        num_items: data.items.reduce((sum, it) => sum + it.quantity, 0),
        content_name: data.items.map((it) => it.name).join(", "),
      });
    }
  }, [shouldFire, data, gaId, pixelId]);

  return null;
}