import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/utils";
import { verifyOrderViewToken, isTokenExpired } from "@/lib/order-token";
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  Calendar,
  CreditCard,
} from "lucide-react";
import type { Metadata } from "next";

/**
 * Customer-facing order tracking page.
 *
 * Public — accessed via magic link in confirmation/shipped emails.
 * URL: /track/[orderNumber]?token=...
 *
 * SECURITY:
 *   - Requires a valid trackingToken (HMAC-hashed in DB, raw in URL)
 *   - 1-year TTL by default
 *   - 404 (not 403) on invalid token to prevent order number enumeration
 *
 * Shows:
 *   - Order number + placed date
 *   - Status timeline (placed → paid → packed → shipped → delivered)
 *   - Items
 *   - Shipment tracking number + carrier (if shipped)
 *   - Shipping address (read-only)
 *   - Customer service contact
 */

interface Props {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Track Order ${orderNumber} | HEUSE`,
    description: "Track your HEUSE order.",
    // Don't index magic-link tracking pages
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

type StepState = "done" | "current" | "pending" | "cancelled";

interface TimelineStep {
  label: string;
  description: string;
  state: StepState;
  date?: Date | null;
}

function buildTimeline(order: {
  status: string;
  paymentStatus: string;
  paidAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}): TimelineStep[] {
  const isCancelled = order.status === "CANCELLED" || order.paymentStatus === "REFUNDED";

  if (isCancelled) {
    return [
      {
        label: "Order placed",
        description: "Order received",
        state: "done",
      },
      {
        label: "Order cancelled",
        description:
          order.paymentStatus === "REFUNDED"
            ? "Refunded — payment returned to your PayPal"
            : "Order was cancelled before payment",
        state: "cancelled",
      },
    ];
  }

  const paid = order.paymentStatus === "PAID" && order.paidAt != null;
  const shipped = order.shippedAt != null;
  const delivered = order.deliveredAt != null;

  return [
    {
      label: "Order placed",
      description: "We received your order",
      state: "done",
    },
    {
      label: "Payment confirmed",
      description: paid ? "Payment received" : "Awaiting payment",
      state: paid ? "done" : "current",
      date: order.paidAt,
    },
    {
      label: "Preparing your order",
      description: shipped
        ? "Packed and ready to ship"
        : paid
        ? "Our team is preparing your piece"
        : "Pending payment confirmation",
      state: shipped ? "done" : paid ? "current" : "pending",
    },
    {
      label: "Shipped",
      description: shipped ? "On the way to you" : "Pending",
      state: shipped ? (delivered ? "done" : "current") : "pending",
      date: order.shippedAt,
    },
    {
      label: "Delivered",
      description: delivered ? "Package delivered" : "Estimated on arrival",
      state: delivered ? "done" : "pending",
      date: order.deliveredAt,
    },
  ];
}

export default async function TrackOrderPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { token } = await searchParams;

  // Verify token
  const tokenRow = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      trackingToken: true,
      trackingTokenExpiresAt: true,
    },
  });

  if (
    !tokenRow ||
    !tokenRow.trackingToken ||
    !verifyOrderViewToken(token, tokenRow.trackingToken) ||
    isTokenExpired(tokenRow.trackingTokenExpiresAt)
  ) {
    // Generic 404 — don't leak that the order exists
    notFound();
  }

  // Fetch full order for display
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      addressLine1: true,
      city: true,
      province: true,
      postalCode: true,
      country: true,
      subtotal: true,
      shippingCost: true,
      total: true,
      discountCode: true,
      discountAmount: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      trackingNumber: true,
      trackingCarrier: true,
      paypalOrderId: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          name: true,
          size: true,
          price: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const timeline = buildTimeline(order);
  const subtotal = Number(order.subtotal);
  const discount = Number(order.discountAmount ?? 0);
  const shipping = Number(order.shippingCost);
  const total = Number(order.total);

  return (
    <div className="min-h-screen bg-heuse-black text-heuse-text">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="inline-block text-xs uppercase tracking-widest text-heuse-gold mb-6 hover:text-heuse-cream transition-colors"
          >
            ← HEUSE
          </Link>
          <h1 className="font-heading text-4xl md:text-5xl mb-2">
            Track Your Order
          </h1>
          <div className="flex items-center gap-3 flex-wrap mt-4">
            <span className="font-mono text-heuse-gold text-sm tracking-wider">
              {order.orderNumber}
            </span>
            <span className="text-heuse-muted text-sm">
              · Placed {formatDate(new Date(order.createdAt))}
            </span>
          </div>
        </div>

        {/* Status Timeline */}
        <section className="bg-heuse-dark border border-heuse-border p-6 md:p-8 mb-6 rounded-sm">
          <h2 className="font-heading text-2xl mb-8">Status</h2>
          <ol className="space-y-6 relative">
            {/* Vertical line connector */}
            <div
              className="absolute left-[15px] top-3 bottom-3 w-px bg-heuse-border"
              aria-hidden
            />
            {timeline.map((step, idx) => (
              <li key={idx} className="flex gap-4 relative">
                <div className="flex-shrink-0 mt-1 relative z-10">
                  {step.state === "done" && (
                    <div className="w-8 h-8 rounded-full bg-heuse-gold flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-heuse-black" />
                    </div>
                  )}
                  {step.state === "current" && (
                    <div className="w-8 h-8 rounded-full bg-heuse-gold/20 border-2 border-heuse-gold flex items-center justify-center">
                      <div className="w-2 h-2 bg-heuse-gold rounded-full animate-pulse" />
                    </div>
                  )}
                  {step.state === "pending" && (
                    <div className="w-8 h-8 rounded-full bg-heuse-dark border border-heuse-border flex items-center justify-center">
                      <Clock className="w-4 h-4 text-heuse-muted" />
                    </div>
                  )}
                  {step.state === "cancelled" && (
                    <div className="w-8 h-8 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <p
                    className={
                      step.state === "done"
                        ? "font-medium text-heuse-text"
                        : step.state === "current"
                        ? "font-medium text-heuse-gold"
                        : step.state === "cancelled"
                        ? "font-medium text-red-400"
                        : "font-medium text-heuse-muted"
                    }
                  >
                    {step.label}
                  </p>
                  <p className="text-sm text-heuse-muted mt-0.5">{step.description}</p>
                  {step.date && (
                    <p className="text-xs text-heuse-muted mt-1">
                      {formatDate(new Date(step.date))}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Shipment Tracking */}
          {order.trackingNumber && (
            <div className="mt-8 pt-6 border-t border-heuse-border">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-heuse-gold mt-0.5" />
                <div>
                  <p className="text-sm text-heuse-muted">Shipment Tracking</p>
                  <p className="font-mono text-heuse-text mt-1">
                    {order.trackingCarrier && (
                      <span className="text-heuse-gold mr-2">
                        {order.trackingCarrier}:
                      </span>
                    )}
                    {order.trackingNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Items */}
        <section className="bg-heuse-dark border border-heuse-border p-6 md:p-8 mb-6 rounded-sm">
          <h2 className="font-heading text-2xl mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-heuse-gold" />
            Items in this order
          </h2>
          <ul className="divide-y divide-heuse-border">
            {order.items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0 flex justify-between gap-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-heuse-muted">
                    Size {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <p className="font-mono text-sm whitespace-nowrap">
                  {formatMoney(Number(item.price) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <div className="mt-6 pt-6 border-t border-heuse-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-heuse-muted">Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-heuse-muted">
                  Discount {order.discountCode && (
                    <span className="font-mono">({order.discountCode})</span>
                  )}
                </span>
                <span className="text-heuse-gold">−{formatMoney(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-heuse-muted">Shipping</span>
              <span>
                {shipping > 0 ? formatMoney(shipping) : "Calculated at confirmation"}
              </span>
            </div>
            <div className="flex justify-between text-lg pt-3 border-t border-heuse-border">
              <span className="font-heading">Total</span>
              <span className="font-heading text-heuse-gold">{formatMoney(total)}</span>
            </div>
          </div>
        </section>

        {/* Shipping + Contact (2-column on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Shipping address */}
          <section className="bg-heuse-dark border border-heuse-border p-6 rounded-sm">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-heuse-gold" />
              Shipping to
            </h2>
            <div className="text-sm space-y-1">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-heuse-muted">{order.addressLine1}</p>
              <p className="text-heuse-muted">
                {order.city}, {order.province} {order.postalCode}
              </p>
              <p className="text-heuse-muted">{order.country}</p>
              <p className="text-heuse-muted mt-3">{order.customerPhone}</p>
            </div>
          </section>

          {/* Help */}
          <section className="bg-heuse-dark border border-heuse-border p-6 rounded-sm">
            <h2 className="font-heading text-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-heuse-gold" />
              Need help?
            </h2>
            <ul className="text-sm space-y-3">
              <li className="flex items-center gap-2 text-heuse-muted">
                <Mail className="w-4 h-4" />
                <a
                  href={`mailto:cs@heuse.com?subject=Order ${order.orderNumber}`}
                  className="hover:text-heuse-gold transition-colors"
                >
                  cs@heuse.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-heuse-muted">
                <Phone className="w-4 h-4" />
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6281234567890"}?text=Hi, I have a question about order ${order.orderNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-heuse-gold transition-colors"
                >
                  Chat via WhatsApp
                </a>
              </li>
            </ul>
            <p className="text-xs text-heuse-muted mt-6 leading-relaxed">
              Keep this link private. It grants access to view order status without logging in.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-heuse-muted mt-12">
          <Calendar className="w-3 h-3 inline mr-1" />
          Tracking link valid until{" "}
          {order.deliveredAt
            ? formatDate(new Date(order.deliveredAt))
            : formatDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))}
        </div>
      </div>
    </div>
  );
}
