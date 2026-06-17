import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
  mapPayPalStatus,
  type PayPalWebhookEvent,
} from "@/lib/paypal";

/**
 * PayPal webhook handler.
 *
 * Receives events from PayPal when payment status changes.
 * MUST verify signature before processing (per `paypal-1.0.0` skill).
 *
 * Configure in PayPal Dashboard:
 *   Apps & Credentials > [Your App] > Webhooks > Add Webhook
 *   URL: https://<your-domain>/api/paypal/webhook
 *   Events: PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED,
 *           PAYMENT.CAPTURE.REFUNDED, CHECKOUT.ORDER.APPROVED
 *
 * For local dev: use ngrok (https://ngrok.com) to expose localhost.
 *   ngrok http 3000
 *   Then set webhook URL to https://<random>.ngrok-free.app/api/paypal/webhook
 */
export async function POST(req: NextRequest) {
  // Step 1: Read body as text (we need to verify exact bytes)
  const bodyText = await req.text();
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Step 2: Verify signature (CRITICAL — never trust unsigned webhooks)
  const isValid = await verifyWebhookSignature(
    {
      authAlgo: req.headers.get("paypal-auth-algo") || "",
      certUrl: req.headers.get("paypal-cert-url") || "",
      transmissionId: req.headers.get("paypal-transmission-id") || "",
      transmissionSig: req.headers.get("paypal-transmission-sig") || "",
      transmissionTime: req.headers.get("paypal-transmission-time") || "",
    },
    event
  );

  if (!isValid) {
    console.error("[paypal-webhook] Invalid signature", event.id);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Step 3: Idempotency — PayPal WILL retry if our response is slow/failed.
  // Persist event.id so retries are no-ops. Use a transaction-safe INSERT:
  // if the row already exists, the unique constraint fails and we short-circuit.
  try {
    await prisma.webhookEvent.create({
      data: {
        id: event.id,
        provider: "paypal",
        type: event.event_type,
        resourceId: event.resource.id,
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation = already processed
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      console.log(`[paypal-webhook] Duplicate event ${event.id}, skipping`);
      return NextResponse.json({ ok: true, note: "Duplicate event, already processed" });
    }
    throw err;
  }

  console.log(`[paypal-webhook] ${event.event_type} for ${event.resource.id}`);

  // Step 4: Find our order via paypalOrderId or custom_id
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { paypalOrderId: event.resource.id },
        { orderNumber: event.resource.custom_id },
      ],
    },
    include: { items: true },
  });

  if (!order) {
    // PayPal may send events for orders we don't know about — return 200
    // to prevent retries.
    console.warn(`[paypal-webhook] Order not found for ${event.resource.id}`);
    return NextResponse.json({ ok: true, note: "Order not found, ignored" });
  }

  // Step 5: Map status and update
  const captureStatus = (event.resource as { status?: string }).status;
  const mapped = mapPayPalStatus(event.event_type, captureStatus);

  // Idempotency: skip if order is already in a final state.
  // This prevents double-decrement when both capture-order AND webhook fire.
  const isAlreadyPaid = order.paymentStatus === "PAID";
  const isAlreadyCancelled = order.status === "CANCELLED";
  const isFinalState = isAlreadyPaid || isAlreadyCancelled;

  // Step 6: Handle state transitions
  if (mapped.orderStatus === "CANCELLED" && !isAlreadyCancelled) {
    // Cancelled (e.g., payment denied) — release stock
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: mapped.paymentStatus,
          status: mapped.orderStatus,
          paymentResponse: JSON.stringify(event),
        },
      });
    });
  } else if (mapped.paymentStatus === "PAID" && !isAlreadyPaid) {
    // Newly PAID — decrement stock (atomic with order update)
    try {
      await prisma.$transaction(async (tx) => {
        // Pre-flight stock check
        for (const item of order.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, product: { select: { name: true } } },
          });
          if (!variant || variant.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for ${variant?.product.name ?? "item"} (need ${item.quantity}, have ${variant?.stock ?? 0})`
            );
          }
        }
        // Decrement stock
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
        // Update order
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: mapped.paymentStatus,
            status: mapped.orderStatus,
            paidAt: new Date(),
            paymentResponse: JSON.stringify(event),
          },
        });
      });
    } catch (txErr) {
      const message = txErr instanceof Error ? txErr.message : "Transaction failed";
      console.error(`[paypal-webhook] ${message} for order ${order.orderNumber}`);
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          internalNote: `AUTO-CANCELLED at webhook: ${message}. PayPal captured the money — admin must issue refund via PayPal dashboard.`,
        },
      });
    }
  } else if (!isFinalState) {
    // Other status update (e.g., payment pending) — no stock change
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: mapped.paymentStatus,
        status: mapped.orderStatus,
        paymentResponse: JSON.stringify(event),
      },
    });
  }
  // If isFinalState and no state change needed, no-op (idempotent)

  return NextResponse.json({ ok: true });
}

/**
 * PayPal sends GET for health checks. Just acknowledge.
 */
export async function GET() {
  return NextResponse.json({ ok: true, service: "heuse-paypal-webhook" });
}
