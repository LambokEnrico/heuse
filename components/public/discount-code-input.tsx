"use client";

import { useState, useTransition } from "react";
import { Tag, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useCartStore } from "@/components/public/cart-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

interface ValidateResponse {
  ok: boolean;
  code?: string;
  type?: "PERCENTAGE" | "FIXED";
  value?: number;
  discountAmount?: number;
  displayValue?: string;
  description?: string;
  error?: string;
}

/**
 * Promo code input + applied state.
 *
 * Calls POST /api/discount/validate with current cart subtotal.
 * On success, stores appliedDiscount in cart store. The store persists
 * across page navigation, so checkout sees the same code.
 *
 * UX:
 *   - Empty state: input + "Apply" button
 *   - Applied state: green badge with code + discount, "Remove" button
 *   - Error: red message under input
 *   - Loading: spinner inside Apply button
 */
export function DiscountCodeInput({
  customerEmail,
}: {
  customerEmail?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { getSubtotal, appliedDiscount, setAppliedDiscount } = useCartStore();
  const subtotal = getSubtotal();

  const apply = () => {
    setError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter a promo code");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/discount/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: trimmed,
            subtotal,
            customerEmail: customerEmail ?? "",
          }),
        });
        const data: ValidateResponse = await res.json();

        if (!data.ok) {
          setError(data.error || "Invalid promo code");
          return;
        }

        setAppliedDiscount({
          code: data.code!,
          type: data.type!,
          value: data.value!,
          discountAmount: data.discountAmount!,
          displayValue: data.displayValue!,
        });
        setCode("");
      } catch (e) {
        setError("Failed to validate. Please try again.");
      }
    });
  };

  const remove = () => {
    setAppliedDiscount(null);
    setError(null);
  };

  if (appliedDiscount) {
    return (
      <div className="border border-heuse-gold/30 bg-heuse-gold/5 p-4 rounded-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-heuse-gold flex-shrink-0" />
              <span className="font-mono font-semibold text-heuse-gold tracking-wider">
                {appliedDiscount.code}
              </span>
              <span className="text-xs text-heuse-muted">
                ({appliedDiscount.displayValue} off)
              </span>
            </div>
            <p className="text-sm text-heuse-muted mt-1">
              You saved <span className="text-heuse-gold font-semibold">{formatMoney(appliedDiscount.discountAmount)}</span>
            </p>
            {appliedDiscount.type === "PERCENTAGE" && (
              <p className="text-xs text-heuse-muted mt-0.5 italic">
                Discount applied to subtotal
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            className="text-heuse-muted hover:text-heuse-text transition-colors p-1"
            aria-label="Remove promo code"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor="promo-code"
        className="flex items-center gap-2 text-sm text-heuse-muted mb-2"
      >
        <Tag className="w-3.5 h-3.5" />
        Have a promo code?
      </label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Enter code"
          className="bg-transparent border-heuse-border uppercase tracking-wider font-mono"
          disabled={isPending}
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          type="button"
          onClick={apply}
          disabled={isPending || !code.trim()}
          className="bg-heuse-gold text-heuse-black hover:bg-[#c9a862] px-6"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}
