"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "./cart-store";
import { toast } from "@/components/ui/toast";
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
  availability: "available" | "low-stock" | "sold-out" | "reserved";
}

export function SizeSelector({
  productId,
  variants,
  productSlug,
  productName,
  productPrice,
  productImage,
  availability,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = () => {
    if (availability === "sold-out") {
      toast.error("This item is sold out");
      return;
    }

    if (variants.length > 0 && !selectedVariantId) {
      toast.error("Please select a size");
      return;
    }

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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-heuse-muted uppercase tracking-wider">Select Size</p>
        {selectedVariantId && (
          <p className="text-sm text-heuse-gold">
            {variants.find((v) => v.id === selectedVariantId)?.size}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => setSelectedVariantId(variant.id)}
            className={cn(
              "min-w-[48px] px-4 py-2 text-sm border transition-colors",
              selectedVariantId === variant.id
                ? "border-heuse-gold text-heuse-gold"
                : "border-heuse-border text-heuse-muted hover:border-heuse-gold",
              variant.stock <= 0 && "opacity-50 cursor-not-allowed line-through"
            )}
          >
            {variant.size}
          </button>
        ))}
      </div>
    </div>
  );
}