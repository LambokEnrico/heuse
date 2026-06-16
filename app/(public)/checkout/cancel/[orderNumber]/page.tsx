import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XCircle, AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { PayRetryButton } from "../../success/[orderNumber]/pay-retry-button";
import { verifyOrderViewToken, isTokenExpired } from "@/lib/order-token";

interface Props {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} Cancelled | HEUSE`,
    description: "Your payment was cancelled.",
  };
}

export default async function CheckoutCancelPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { token } = await searchParams;

  // SECURITY: same token gate as success page (prevent IDOR on order data)
  const tokenRow = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      viewToken: true,
      viewTokenExpiresAt: true,
      paymentStatus: true,
      status: true,
      orderNumber: true,
      total: true,
      customerName: true,
    },
  });

  if (
    !tokenRow ||
    !tokenRow.viewToken ||
    !verifyOrderViewToken(token, tokenRow.viewToken) ||
    isTokenExpired(tokenRow.viewTokenExpiresAt)
  ) {
    notFound();
  }

  // If the order is already paid, the user is in the wrong place — redirect
  // them to the success page (which is the authoritative source of truth).
  if (tokenRow.paymentStatus === "PAID") {
    return (
      <div className="min-h-screen bg-heuse-black">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="font-heading text-4xl mb-4">Payment Already Confirmed</h1>
          <p className="text-heuse-muted text-lg mb-8">
            This order has already been paid. View the order details for confirmation.
          </p>
          <Link href={`/checkout/success/${tokenRow.orderNumber}?token=${encodeURIComponent(token || "")}`}>
            <Button className="bg-heuse-gold text-heuse-black hover:bg-[#c9a862] py-6 px-8">
              View Order Status
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Order is unpaid + user cancelled — order still exists in DB awaiting payment
  return (
    <div className="min-h-screen bg-heuse-black">
      <div className="bg-heuse-dark py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-900/30 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="font-heading text-4xl md:text-5xl mb-4">Payment Cancelled</h1>
          <p className="text-heuse-muted text-lg mb-2">
            You cancelled the PayPal payment. Your order is still saved
            and waiting for payment.
          </p>
          <p className="text-heuse-muted text-sm mb-2">
            No money was charged. Your order is reserved for 24 hours.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Badge variant="gold" className="text-lg px-4 py-2">
              Order #{tokenRow.orderNumber}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {tokenRow.paymentStatus}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick order summary (safe fields only) */}
        <div className="bg-heuse-dark p-6 mb-8">
          <h2 className="font-heading text-2xl mb-4">Order Summary</h2>
          <div className="flex justify-between text-heuse-muted">
            <span>Total</span>
            <span className="text-heuse-text font-medium">
              {formatMoney(Number(tokenRow.total))}
            </span>
          </div>
        </div>

        {/* What happens next */}
        <div className="bg-heuse-dark p-6 mb-8">
          <h2 className="font-heading text-2xl mb-4">What you can do</h2>
          <ul className="space-y-3 text-sm text-heuse-muted list-disc pl-5">
            <li>
              Click <span className="text-heuse-gold font-medium">Try Payment Again</span> to
              return to the PayPal checkout and complete your purchase.
            </li>
            <li>
              The order will remain in the system for 24 hours. If unpaid after that,
              it will be automatically marked as expired.
            </li>
            <li>
              If you encountered an issue, please contact support with your order number.
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <PayRetryButton
            orderId={tokenRow.id}
            orderNumber={tokenRow.orderNumber}
            viewState="awaiting"
          />
          <Link href="/products" className="flex-1">
            <Button
              variant="outline"
              className="w-full border-heuse-border text-heuse-muted hover:border-heuse-gold hover:text-heuse-gold py-6"
            >
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
