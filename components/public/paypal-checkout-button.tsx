"use client";

import { useEffect, useState } from "react";

/**
 * PayPal JS SDK loader + button.
 *
 * Loads the PayPal SDK script once and renders a button that
 * redirects to PayPal's approval URL when clicked.
 *
 * This is a server-rendered redirect approach (no popup),
 * matching PayPal's "Web checkout" pattern.
 *
 * For an embedded popup experience, swap to <PayPalButtons /> from
 * @paypal/react-paypal-js (requires installing that package).
 */

const PAYPAL_JS_SANDBOX = "https://www.sandbox.paypal.com/sdk/js";
const PAYPAL_JS_LIVE = "https://www.paypal.com/sdk/js";

interface PayPalButtonProps {
  /** URL returned from /api/paypal/create-order */
  approvalUrl: string;
  /** Disable the button (e.g., during navigation) */
  disabled?: boolean;
  /** Custom button text */
  label?: string;
  /** Optional className for styling */
  className?: string;
}

export function PayPalCheckoutButton({
  approvalUrl,
  disabled = false,
  label = "Pay with PayPal",
  className = "",
}: PayPalButtonProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Just track that component mounted; SDK not needed for redirect approach
    setIsReady(true);
  }, []);

  const isLive = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "live";

  return (
    <a
      href={approvalUrl}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        padding: "0.875rem 1.5rem",
        backgroundColor: isLive ? "#0070ba" : "#ffc439",
        color: isLive ? "#ffffff" : "#003087",
        border: "none",
        borderRadius: "0.5rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled || !isReady ? 0.5 : 1,
        textDecoration: "none",
        transition: "opacity 0.2s",
      }}
      aria-disabled={disabled}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
      </svg>
      {label}
    </a>
  );
}

/**
 * Component that confirms a payment after PayPal redirects back.
 * Used on /checkout/success/[orderNumber] page.
 */
export function PayPalCaptureHandler({
  orderId,
  paypalOrderId,
  onComplete,
}: {
  orderId: string;
  paypalOrderId: string;
  onComplete: (success: boolean, error?: string) => void;
}) {
  const [status, setStatus] = useState<"pending" | "capturing" | "success" | "error">(
    "pending"
  );

  useEffect(() => {
    async function capture() {
      setStatus("capturing");
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, paypalOrderId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Capture failed");
        }
        setStatus("success");
        onComplete(true);
      } catch (err) {
        setStatus("error");
        onComplete(false, err instanceof Error ? err.message : "Unknown error");
      }
    }
    capture();
  }, [orderId, paypalOrderId, onComplete]);

  return { status };
}
