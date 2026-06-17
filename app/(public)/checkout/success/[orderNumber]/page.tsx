import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { PayRetryButton } from "./pay-retry-button";
import { PayPalAutoCapture } from "./paypal-auto-capture";
import { verifyOrderViewToken, isTokenExpired } from "@/lib/order-token";

interface Props {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{
    status?: string;
    retry?: string;
    token?: string;
    viewToken?: string;
    PayerID?: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} | HEUSE`,
    description: "Your order status.",
  };
}

type ViewState = "paid" | "awaiting" | "failed" | "expired" | "unknown";

function getViewState(
  paymentStatus: string,
  orderStatus: string,
  urlStatus?: string
): ViewState {
  // URL hint takes priority (set by snap.pay callbacks)
  if (urlStatus === "error" || urlStatus === "closed") return "failed";
  if (urlStatus === "pending") return "awaiting";
  if (urlStatus === "success") return "paid";

  // Otherwise use DB state (in case webhook already updated)
  if (paymentStatus === "PAID") return "paid";
  if (paymentStatus === "EXPIRED") return "expired";
  if (paymentStatus === "FAILED") return "failed";
  if (orderStatus === "CANCELLED" && paymentStatus !== "PAID") return "failed";
  if (paymentStatus === "UNPAID" && orderStatus === "AWAITING_PAYMENT") return "awaiting";
  return "unknown";
}

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { status: urlStatus, retry, token, viewToken } = await searchParams;

  // SECURITY: Require a valid view token to access this page.
  // The token is generated at order creation and embedded in the PayPal
  // return_url. Without a valid token, we don't reveal whether the order
  // exists (404 instead of 403, to prevent enumeration).
  //
  // CRITICAL: Prefer 'viewToken' over 'token' because PayPal overwrites
  // '?token=...' with the PayPal order ID on redirect. See:
  //   app/api/paypal/create-order/route.ts (tokenSuffix)
  //   app/(public)/checkout/cancel/[orderNumber]/page.tsx
  //   app/(public)/checkout/success/[orderNumber]/pay-retry-button.tsx
  const authToken = viewToken || token;

  const tokenRow = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      viewToken: true,
      viewTokenExpiresAt: true,
    },
  });

  if (
    !tokenRow ||
    !tokenRow.viewToken ||
    !verifyOrderViewToken(authToken, tokenRow.viewToken) ||
    isTokenExpired(tokenRow.viewTokenExpiresAt)
  ) {
    notFound();
  }

  // Re-fetch with full data after authorization check passes
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: { select: { name: true, slug: true } },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const viewState = getViewState(order.paymentStatus, order.status, urlStatus);
  const canRetry = viewState === "awaiting" || viewState === "failed" || viewState === "expired";

  return (
    <div className="min-h-screen bg-heuse-black">
      {/* Auto-capture: triggered when user returns from PayPal approval */}
      {urlStatus !== "success" &&
        order.paypalOrderId &&
        order.paymentStatus !== "PAID" && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <PayPalAutoCapture
              orderId={order.id}
              paypalOrderId={order.paypalOrderId}
              orderNumber={order.orderNumber}
            />
          </div>
        )}

      {/* Status Header */}
      <div className="bg-heuse-dark py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {viewState === "paid" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="font-heading text-4xl md:text-5xl mb-4">Payment Confirmed</h1>
              <p className="text-heuse-muted text-lg mb-2">
                Thank you. Your payment was received and your order is confirmed.
              </p>
            </>
          )}
          {viewState === "awaiting" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-500" />
              </div>
              <h1 className="font-heading text-4xl md:text-5xl mb-4">Awaiting Payment</h1>
              <p className="text-heuse-muted text-lg mb-2">
                Your order is created. Complete the payment to confirm your order.
              </p>
            </>
          )}
          {viewState === "failed" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-900/30 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="font-heading text-4xl md:text-5xl mb-4">Payment Failed</h1>
              <p className="text-heuse-muted text-lg mb-2">
                Something went wrong with your payment. Please try again.
              </p>
            </>
          )}
          {viewState === "expired" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-zinc-400" />
              </div>
              <h1 className="font-heading text-4xl md:text-5xl mb-4">Payment Session Expired</h1>
              <p className="text-heuse-muted text-lg mb-2">
                Your payment session has expired. Please place a new order.
              </p>
            </>
          )}
          {viewState === "unknown" && (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-zinc-400" />
              </div>
              <h1 className="font-heading text-4xl md:text-5xl mb-4">Order Status Unknown</h1>
              <p className="text-heuse-muted text-lg mb-2">
                We&apos;re checking your payment status. Refresh in a moment.
              </p>
            </>
          )}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Badge variant="gold" className="text-lg px-4 py-2">
              Order #{order.orderNumber}
            </Badge>
            <Badge
              variant={viewState === "paid" ? "default" : "secondary"}
              className="text-lg px-4 py-2"
            >
              {order.paymentStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Order Summary Card */}
        <div className="bg-heuse-dark p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl">Order Summary</h2>
            <Badge
              variant={order.status === "CONFIRMED" ? "default" : "secondary"}
            >
              {order.status.replace("_", " ")}
            </Badge>
          </div>

          {/* Items */}
          <div className="space-y-4 border-b border-heuse-border pb-6">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div className="text-heuse-muted">
                  <span className="text-heuse-text">{item.name}</span>
                  <br />
                  <span className="text-sm">Size: {item.size} × {item.quantity}</span>
                </div>
                <span className="text-heuse-text">
                  {formatMoney(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-3 py-6">
            <div className="flex justify-between text-heuse-muted">
              <span>Subtotal</span>
              <span>{formatMoney(Number(order.subtotal))}</span>
            </div>
            {Number(order.shippingCost) > 0 && (
              <div className="flex justify-between text-heuse-muted">
                <span>Shipping</span>
                <span>{formatMoney(Number(order.shippingCost))}</span>
              </div>
            )}
            <div className="flex justify-between pt-4 border-t border-heuse-border">
              <span className="font-heading text-xl">Total</span>
              <span className="font-heading text-xl text-heuse-text">
                {formatMoney(Number(order.total))}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-heuse-dark p-6 mb-8">
          <h2 className="font-heading text-2xl mb-6">Shipping Address</h2>
          <div className="text-heuse-muted space-y-1">
            <p className="text-heuse-text font-medium">{order.customerName}</p>
            <p>{order.addressLine1}</p>
            <p>{order.city}, {order.province} {order.postalCode || ""}</p>
            <p>{order.country}</p>
            <p className="mt-2">📱 {order.customerPhone}</p>
            <p>📧 {order.customerEmail}</p>
          </div>
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-heuse-border">
              <p className="text-sm text-heuse-muted">
                <span className="font-medium text-heuse-text">Notes:</span> {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-heuse-dark p-6 mb-8">
          <h2 className="font-heading text-2xl mb-6">What happens next</h2>
          <div className="space-y-4 text-sm">
            {viewState === "paid" && (
              <>
                <p className="text-heuse-muted">
                  We&apos;ll prepare your order and ship it within 2–3 business days.
                  You&apos;ll receive a tracking number via email once it ships.
                </p>
              </>
            )}
            {viewState === "awaiting" && (
              <>
                <p className="text-heuse-muted">
                  Click <span className="text-heuse-gold font-medium">Pay Now</span> below to
                  open the secure payment page. Your order is reserved for 24 hours.
                </p>
              </>
            )}
            {viewState === "failed" && (
              <p className="text-heuse-muted">
                Your payment didn&apos;t go through. Click <span className="text-heuse-gold font-medium">Try Again</span> to retry.
              </p>
            )}
            {viewState === "expired" && (
              <p className="text-heuse-muted">
                Please return to the shop and place a new order.
              </p>
            )}
            {viewState === "unknown" && (
              <p className="text-heuse-muted">
                We&apos;re waiting for the payment confirmation from PayPal. Refresh this
                page in a moment.
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          {canRetry && (
            <PayRetryButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              viewState={viewState}
            />
          )}
          <Link href="/products" className="flex-1">
            <Button
              variant="outline"
              className="w-full border-heuse-border text-heuse-muted hover:border-heuse-gold hover:text-heuse-gold py-6"
            >
              Continue Shopping
            </Button>
          </Link>
          {viewState === "unknown" && (
            <Link
              href={`/checkout/success/${order.orderNumber}?viewToken=${encodeURIComponent(authToken || "")}`}
              className="flex-1"
            >
              <Button className="w-full bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </Link>
          )}
        </div>

        {/* Auto-retry hint */}
        {(retry === "1" || viewState === "awaiting") && !canRetry && (
          <p className="text-center text-xs text-heuse-muted mt-4">
            We&apos;ll automatically check your payment status in a few seconds.
          </p>
        )}
      </div>
    </div>
  );
}
