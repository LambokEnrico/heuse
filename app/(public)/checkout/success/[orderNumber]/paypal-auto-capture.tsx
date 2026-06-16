"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface Props {
  /** Our internal order id (cuid) — used to update DB. */
  orderId: string;
  /** PayPal's order id (from URL ?token=... after PayPal redirect). */
  paypalOrderId: string;
  /** Human-readable order number for display. */
  orderNumber: string;
}

/**
 * Auto-capture PayPal payment when the user returns from PayPal approval.
 *
 * PayPal redirects back to our return_url with:
 *   ?token=<PayPalOrderId>&PayerID=<...>
 *
 * At that point the buyer has approved, but we haven't captured the money yet.
 * This component:
 *  1. Calls POST /api/paypal/capture-order to finalize the payment
 *  2. Refreshes the page so the UI shows the new "PAID" state
 *  3. Surfaces errors gracefully (user can retry from the page)
 */
export function PayPalAutoCapture({ orderId, paypalOrderId, orderNumber }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"capturing" | "success" | "error">("capturing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function capture() {
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paypalOrderId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(data.error || data.details || "Capture failed");
        }
        setStatus("success");
        // Refresh server data so the page shows the new paid status
        router.refresh();
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }

    capture();
    return () => {
      cancelled = true;
    };
  }, [orderId, paypalOrderId, router]);

  if (status === "capturing") {
    return (
      <div className="bg-amber-900/20 border border-amber-500/30 p-4 mb-6 flex items-start gap-3">
        <Loader2 className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-spin" />
        <div>
          <p className="text-amber-200 text-sm font-medium">
            Confirming your payment with PayPal…
          </p>
          <p className="text-heuse-muted text-xs mt-1">
            Order <span className="font-mono">{orderNumber}</span> — this usually takes
            a couple of seconds.
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-green-900/20 border border-green-500/30 p-4 mb-6 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <p className="text-green-200 text-sm font-medium">Payment captured.</p>
      </div>
    );
  }

  return (
    <div className="bg-red-900/20 border border-red-500/30 p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-red-200 text-sm font-medium">
          Could not finalize payment with PayPal
        </p>
        <p className="text-heuse-muted text-xs mt-1">{error}</p>
        <p className="text-heuse-muted text-xs mt-2">
          Your payment may have been authorized. Refresh the page, or contact support
          with order <span className="font-mono">{orderNumber}</span>.
        </p>
      </div>
    </div>
  );
}
