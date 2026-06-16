"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "./cart-store";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface CartItemProps {
  item: {
    productId: string;
    variantId: string;
    slug: string;
    name: string;
    size: string;
    imageUrl: string;
    price: number;
    quantity: number;
  };
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  return (
    <div className="flex gap-4 py-6 border-b border-heuse-border">
      {/* Image */}
      <Link href={`/products/${item.slug}`} className="relative w-24 h-32 bg-heuse-dark flex-shrink-0">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-heuse-muted text-xs">
            No Image
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link
            href={`/products/${item.slug}`}
            className="font-heading text-lg hover:text-heuse-gold transition-colors"
          >
            {item.name}
          </Link>
          <p className="text-heuse-muted text-sm mt-1">Size: {item.size}</p>
          <p className="text-heuse-text mt-2">{formatMoney(item.price)}</p>
        </div>

        <div className="flex items-center justify-between mt-4">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
              className="w-8 h-8 flex items-center justify-center border border-heuse-border hover:border-heuse-gold transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
              className="w-8 h-8 flex items-center justify-center border border-heuse-border hover:border-heuse-gold transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => removeItem(item.productId, item.variantId)}
            className="text-heuse-muted hover:text-red-500 transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtotal */}
      <div className="flex flex-col items-end justify-between">
        <span className="text-heuse-text font-medium">
          {formatMoney(item.price * item.quantity)}
        </span>
      </div>
    </div>
  );
}