"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Database order id (cuid). Sent to /api/paypal/create-order. */
  orderId: string;
  /** Human-readable order number (e.g. HEUSE-XXXXX-XX) for display/URLs. */
  orderNumber: string;
  viewState: "paid" | "awaiting" | "failed" | "expired" | "unknown";
}

/**
 * PayPal "Pay Now" / "Try Again" button on the checkout success page.
 *
 * Flow:
 *  1. POST /api/paypal/create-order with our internal orderId
 *  2. Server returns an `approvalUrl` from PayPal
 *  3. We redirect the browser to that URL
 *  4. After approval, PayPal redirects back to /checkout/success/[orderNumber]?token=...&PayerID=...
 *  5. PayPalCaptureHandler (in the page) then calls /api/paypal/capture-order
 */
export function PayRetryButton({ orderId, orderNumber, viewState }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      // SECURITY: Include the viewToken so the success page can authenticate
      // when PayPal redirects back. Fall back to the current URL's token.
      const urlToken = new URLSearchParams(window.location.search).get("token");
      const stored = sessionStorage.getItem("pendingPayment");
      const sessionToken = stored
        ? (JSON.parse(stored) as { viewToken?: string | null }).viewToken ?? null
        : null;
      const viewToken = urlToken || sessionToken || undefined;

      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, viewToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.approvalUrl) {
        throw new Error(data.error || "Failed to create PayPal order");
      }
      // Redirect to PayPal approval URL
      window.location.href = data.approvalUrl;
    } catch (err) {
      console.error("[PayRetryButton]", err);
      alert(
        "Could not start payment. Make sure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are configured. See PAYPAL-SETUP.md."
      );
      setLoading(false);
    }
  }

  if (viewState === "expired") {
    return (
      <Link href="/products" className="flex-1">
        <Button className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6">
          Place New Order
        </Button>
      </Link>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className="flex-1 bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Opening payment...
        </>
      ) : (
        <>
          {viewState === "failed" ? (
            <RefreshCw className="w-4 h-4 mr-2" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {viewState === "failed" ? "Try Again" : "Pay Now"}
        </>
      )}
    </Button>
  );
}
