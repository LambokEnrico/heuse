"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

type AppliedDiscount = {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
  displayValue: string;
};

type CartStore = {
  items: CartItem[];
  /** Single-item "buy now" override. When set, checkout uses this instead of `items`. */
  buyNowItem: CartItem | null;
  /** Discount code currently applied to the cart (null = none) */
  appliedDiscount: AppliedDiscount | null;
  /** Tracks whether the store has hydrated from localStorage */
  _hasHydrated: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string) => void;
  updateQuantity: (productId: string, variantId: string, quantity: number) => void;
  clearCart: () => void;
  setBuyNowItem: (item: CartItem | null) => void;
  clearBuyNowItem: () => void;
  setAppliedDiscount: (d: AppliedDiscount | null) => void;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;
  getTotalItems: () => number;
  setHasHydrated: (state: boolean) => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      buyNowItem: null,
      appliedDiscount: null,
      _hasHydrated: false,

      addItem: (item) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );

        if (existingIndex > -1) {
          const newItems = [...items];
          newItems[existingIndex].quantity += item.quantity;
          set({ items: newItems });
        } else {
          set({ items: [...items, item] });
        }
      },

      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        });
      },

      updateQuantity: (productId, variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [], appliedDiscount: null }),

      setBuyNowItem: (item) => set({ buyNowItem: item }),

      clearBuyNowItem: () => set({ buyNowItem: null }),

      setAppliedDiscount: (d) => set({ appliedDiscount: d }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      },

      getDiscountAmount: () => {
        return get().appliedDiscount?.discountAmount ?? 0;
      },

      getTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal - discount);
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "heuse-cart",
      // Don't persist buyNowItem — it's transient and should not survive page refreshes
      // in a way that confuses the user.
      // Also skip _hasHydrated since it's a runtime-only flag
      partialize: (state) => ({
        items: state.items,
        appliedDiscount: state.appliedDiscount,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark hydration as complete after state is restored
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook for cart count (for header badge) — excludes buyNowItem
// Also returns 0 until hydration is complete to prevent SSR mismatch
export function useCartCount() {
  return useCartStore((state) =>
    state._hasHydrated
      ? state.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0
  );
}

// Hook to check if cart has hydrated (useful for pages that need to wait)
export function useCartHydrated() {
  return useCartStore((state) => state._hasHydrated);
}
