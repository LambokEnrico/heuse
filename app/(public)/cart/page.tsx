"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCartStore } from "@/components/public/cart-store";
import { CartItem } from "@/components/public/cart-item";
import { DiscountCodeInput } from "@/components/public/discount-code-input";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const router = useRouter();
  const { items, getSubtotal, getTotal } = useCartStore();
  const subtotal = getSubtotal();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-heuse-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-heuse-dark flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-heuse-muted" />
          </div>
          <h1 className="font-heading text-3xl mb-4">Your Cart is Empty</h1>
          <p className="text-heuse-muted mb-8">
            Your wardrobe is still waiting for its first HEUSE piece.
          </p>
          <Link href="/products">
            <Button className="bg-heuse-gold text-heuse-black hover:bg-[#c9a862]">
              Explore Collection
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl md:text-5xl">Shopping Cart</h1>
        <p className="text-heuse-muted mt-2">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {/* Cart Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items List */}
          <div className="lg:col-span-2">
            <div className="bg-heuse-dark p-6">
              {items.map((item) => (
                <CartItem key={`${item.productId}-${item.variantId}`} item={item} />
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center text-heuse-muted hover:text-heuse-gold transition-colors text-sm"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-heuse-dark p-6 sticky top-24">
              <h2 className="font-heading text-2xl mb-6">Order Summary</h2>

              {/* Subtotal */}
              <div className="space-y-4 border-b border-heuse-border pb-6">
                <div className="flex justify-between text-heuse-muted">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-heuse-muted">
                  <span>Shipping</span>
                  <span className="text-heuse-gold">Calculated at checkout</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="py-6 border-b border-heuse-border">
                <DiscountCodeInput />
              </div>

              {/* Total */}
              <div className="flex justify-between py-6">
                <span className="font-heading text-xl">Total</span>
                <span className="font-heading text-xl text-heuse-text">{formatMoney(getTotal())}</span>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={() => router.push("/checkout")}
                className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 text-sm uppercase tracking-widest"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* WhatsApp CTA */}
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281234567890"}?text=Hi, I'd like to discuss my cart order`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full mt-4 text-center border border-heuse-border text-heuse-muted py-3 text-sm uppercase tracking-widest hover:border-heuse-gold hover:text-heuse-gold transition-colors"
              >
                Need Help? Chat with Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}