"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowLeft, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/components/public/cart-store";
import { DiscountCodeInput } from "@/components/public/discount-code-input";
import { createOrderWithPayPalPayment } from "@/app/actions";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { PayPalCheckoutButton } from "@/components/public/paypal-checkout-button";

const checkoutSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  addressLine1: z.string().min(10, "Please enter a complete address"),
  city: z.string().min(2, "Please enter a city"),
  province: z.string().min(2, "Please enter a province"),
  postalCode: z.string().min(4, "Please enter a valid postal code"),
  country: z.string().min(1),
  notes: z.string().max(500).optional().or(z.literal("")),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-heuse-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-heuse-gold" />
      </div>
    }>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get("mode") === "buy-now";

  const { items, buyNowItem, getSubtotal, getTotal, appliedDiscount, clearCart, clearBuyNowItem } = useCartStore();

  // Choose items: Buy Now (single) takes priority over cart
  const checkoutItems = useMemo(
    () => (isBuyNow && buyNowItem ? [buyNowItem] : items),
    [isBuyNow, buyNowItem, items]
  );
  const subtotal = useMemo(
    () =>
      isBuyNow && buyNowItem
        ? buyNowItem.price * buyNowItem.quantity
        : getSubtotal(),
    [isBuyNow, buyNowItem, getSubtotal]
  );
  const discountAmount = appliedDiscount?.discountAmount ?? 0;
  const total = Math.max(0, subtotal - discountAmount);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      country: "Indonesia",
    },
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if no items to check out
  useEffect(() => {
    if (checkoutItems.length === 0) {
      router.push("/cart");
    }
  }, [checkoutItems.length, router]);

  async function onSubmit(data: CheckoutFormData) {
    // Generate idempotency key (in case user retries the same submission)
    const idempotencyKey = crypto.randomUUID();

    const orderItems = checkoutItems.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    const result = await createOrderWithPayPalPayment({
      idempotencyKey,
      customer: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        addressLine1: data.addressLine1,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        country: data.country,
      },
      items: orderItems,
      notes: data.notes,
      discountCode: appliedDiscount?.code,
    });

    if (!result.success) {
      toast({
        title: "Order failed",
        description: result.error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const { orderId, orderNumber, paypalOrderId, approvalUrl, viewToken } = result.data;

    // Clear the buy-now state immediately so a refresh doesn't re-charge
    if (isBuyNow) clearBuyNowItem();
    else clearCart();

    // Store the orderId + viewToken in sessionStorage as a fallback
    // (the viewToken is also embedded in the PayPal return_url, so this
    // is only needed if the user navigates back to the success page
    // without going through PayPal — e.g. via the "refresh status" link).
    sessionStorage.setItem(
      `pendingPayment`,
      JSON.stringify({ orderId, paypalOrderId, orderNumber, viewToken })
    );

    // Redirect to PayPal approval URL
    window.location.href = approvalUrl;
  }

  if (checkoutItems.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/cart"
          className="inline-flex items-center text-heuse-muted hover:text-heuse-gold transition-colors text-sm mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Link>
        <h1 className="font-heading text-4xl md:text-5xl">
          {isBuyNow ? "Buy Now" : "Checkout"}
        </h1>
      </div>

      {/* Checkout Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Customer Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Contact Information */}
              <div className="bg-heuse-dark p-6">
                <h2 className="font-heading text-2xl mb-6">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      {...register("fullName")}
                      className="bg-transparent border-heuse-border mt-1"
                      placeholder="Your full name"
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      className="bg-transparent border-heuse-border mt-1"
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      {...register("phone")}
                      className="bg-transparent border-heuse-border mt-1"
                      placeholder="+62 812 3456 7890"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-heuse-dark p-6">
                <h2 className="font-heading text-2xl mb-6">Shipping Address</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address *</Label>
                    <Input
                      id="addressLine1"
                      {...register("addressLine1")}
                      className="bg-transparent border-heuse-border mt-1"
                      placeholder="Street address, building, etc."
                    />
                    {errors.addressLine1 && (
                      <p className="text-red-500 text-sm mt-1">{errors.addressLine1.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        {...register("city")}
                        className="bg-transparent border-heuse-border mt-1"
                        placeholder="Jakarta"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="province">Province *</Label>
                      <Input
                        id="province"
                        {...register("province")}
                        className="bg-transparent border-heuse-border mt-1"
                        placeholder="DKI Jakarta"
                      />
                      {errors.province && (
                        <p className="text-red-500 text-sm mt-1">{errors.province.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="postalCode">Postal Code *</Label>
                      <Input
                        id="postalCode"
                        {...register("postalCode")}
                        className="bg-transparent border-heuse-border mt-1"
                        placeholder="12345"
                      />
                      {errors.postalCode && (
                        <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        {...register("country")}
                        className="bg-transparent border-heuse-border mt-1"
                        placeholder="Indonesia"
                      />
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-heuse-dark p-6">
                <h2 className="font-heading text-2xl mb-6">Order Notes (Optional)</h2>
                <Textarea
                  {...register("notes")}
                  className="bg-transparent border-heuse-border min-h-[100px]"
                  placeholder="Any special instructions for your order..."
                />
                {errors.notes && (
                  <p className="text-red-500 text-sm mt-1">{errors.notes.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 text-sm uppercase tracking-widest"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Continue to PayPal
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-heuse-dark p-6 sticky top-24">
              <h2 className="font-heading text-2xl mb-6">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 border-b border-heuse-border pb-6">
                {checkoutItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-heuse-muted">
                      {item.name} × {item.quantity}
                      <br />
                      <span className="text-xs">Size: {item.size}</span>
                    </span>
                    <span className="text-heuse-text">{formatMoney(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-3 py-6 border-b border-heuse-border">
                <div className="flex justify-between text-heuse-muted">
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {appliedDiscount && (
                  <div className="flex justify-between text-heuse-gold">
                    <span className="flex items-center gap-1">
                      Discount <span className="font-mono text-xs">({appliedDiscount.code})</span>
                    </span>
                    <span>−{formatMoney(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-heuse-muted">
                  <span>Shipping</span>
                  <span className="text-heuse-gold">To be confirmed</span>
                </div>
              </div>

              {/* Promo Code */}
              <div className="py-6 border-b border-heuse-border">
                <DiscountCodeInput customerEmail={undefined} />
              </div>

              {/* Total */}
              <div className="flex justify-between py-6">
                <span className="font-heading text-xl">Total</span>
                <span className="font-heading text-xl text-heuse-text">{formatMoney(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}