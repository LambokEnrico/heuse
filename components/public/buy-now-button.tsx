"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Zap } from "lucide-react";
import { useCartStore } from "./cart-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Variant {
  id: string;
  size: string;
  stock: number;
}

interface Props {
  productId: string;
  variants: Variant[];
  productSlug: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  availability: "available" | "low-stock" | "sold-out";
}

/**
 * Buy Now: bypass cart, set buyNowItem, go straight to /checkout.
 * Includes a quantity selector and size picker in one place.
 */
export function BuyNowButton({
  productId,
  variants,
  productSlug,
  productName,
  productPrice,
  productImage,
  availability,
}: Props) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const setBuyNowItem = useCartStore((s) => s.setBuyNowItem);

  if (availability === "sold-out" || variants.length === 0) {
    return null; // Parent will render "Join Waitlist" or similar
  }

  const handleBuyNow = () => {
    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;
    if (quantity > variant.stock) return;

    setBuyNowItem({
      productId,
      variantId: variant.id,
      slug: productSlug,
      name: productName,
      size: variant.size,
      imageUrl: productImage || "",
      price: productPrice,
      quantity,
    });
    router.push("/checkout?mode=buy-now");
  };

  return (
    <div className="space-y-4">
      {/* Size + Quantity row */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs text-heuse-muted uppercase tracking-wider mb-2">
            Size
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                disabled={variant.stock <= 0}
                className={cn(
                  "min-w-[48px] px-3 py-2 text-sm border transition-colors",
                  selectedVariantId === variant.id
                    ? "border-heuse-gold text-heuse-gold"
                    : "border-heuse-border text-heuse-muted hover:border-heuse-gold",
                  variant.stock <= 0 && "opacity-40 cursor-not-allowed line-through"
                )}
              >
                {variant.size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-heuse-muted uppercase tracking-wider mb-2">
            Qty
          </p>
          <div className="flex items-center border border-heuse-border">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-heuse-muted hover:text-heuse-gold transition-colors disabled:opacity-30"
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 py-2 text-heuse-text min-w-[3rem] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => {
                const max = variants.find((v) => v.id === selectedVariantId)?.stock ?? 1;
                setQuantity(Math.min(max, quantity + 1));
              }}
              className="px-3 py-2 text-heuse-muted hover:text-heuse-gold transition-colors disabled:opacity-30"
              disabled={
                quantity >=
                (variants.find((v) => v.id === selectedVariantId)?.stock ?? 1)
              }
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Button
        onClick={handleBuyNow}
        className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 text-sm uppercase tracking-widest font-semibold"
      >
        <Zap className="w-4 h-4 mr-2" />
        Buy Now
      </Button>
    </div>
  );
}
