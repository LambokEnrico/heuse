"use client";

import { useState } from "react";
import { useCartStore } from "./cart-store";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
// SizeOption is stored as string in SQLite
type SizeOption = string;

interface Variant {
  id: string;
  size: SizeOption;
  stock: number;
}

interface Props {
  productId: string;
  variants: Variant[];
  productSlug: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  disabled?: boolean;
}

export function AddToCartButton({
  productId,
  variants,
  productSlug,
  productName,
  productPrice,
  productImage,
  disabled,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = async () => {
    if (disabled) return;

    if (variants.length > 0 && !selectedVariantId) {
      toast.error("Please select a size");
      return;
    }

    setLoading(true);
    try {
      const variant = variants.find((v) => v.id === selectedVariantId);
      addItem({
        productId,
        variantId: selectedVariantId || "default",
        slug: productSlug,
        name: productName,
        size: variant?.size || "M",
        imageUrl: productImage || "",
        price: productPrice,
        quantity: 1,
      });
      toast.success(`${productName} added to cart`);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  };

  if (variants.length > 1) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-heuse-muted uppercase tracking-wider">Select Size</p>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setSelectedVariantId(variant.id)}
              disabled={variant.stock <= 0}
              className={cn(
                "min-w-[48px] px-4 py-2 text-sm border transition-colors",
                selectedVariantId === variant.id
                  ? "border-heuse-gold text-heuse-gold"
                  : "border-heuse-border text-heuse-muted hover:border-heuse-gold",
                variant.stock <= 0 && "opacity-50 cursor-not-allowed"
              )}
            >
              {variant.size}
            </button>
          ))}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={loading || disabled}
          className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || disabled}
      className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}