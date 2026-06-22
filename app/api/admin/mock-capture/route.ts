import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmation } from "@/lib/email";
import { issueOrderTrackingToken } from "@/lib/order-token";

/**
 * MOCK capture endpoint — simulates what happens AFTER a successful PayPal capture.
 *
 * Use case: User has no PayPal balance/credit card to test the real flow.
 * This endpoint does the same internal work as /api/paypal/capture-order
 * would do post-capture, without actually charging PayPal:
 *   1. Verify order is AWAITING_PAYMENT
 *   2. Decrement stock for all items (atomic transaction)
 *   3. Mark order as PAID
 *   4. Generate tracking token + persist hash
 *   5. Send confirmation email via Resend
 *
 * Cleanup: After running this, call /api/admin/test-paypal-cleanup
 * with the orderId to restore stock + mark order as CANCELLED.
 *
 * Auth: CRON_SECRET
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orderId: string;
  try {
    const body = await req.json();
    orderId = body.orderId;
  } catch {
    const url = new URL(req.url);
    orderId = url.searchParams.get("orderId") || "";
  }
  if (!orderId) {
    return NextResponse.json(
      { error: "orderId required (body or ?orderId=...)" },
      { status: 400 }
    );
  }

  try {
    // Pre-check order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: true, product: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order already paid", orderStatus: order.status },
        { status: 400 }
      );
    }

    const stockBefore = order.items
      .filter((i) => i.variantId)
      .map((i) => ({
        variantId: i.variantId!,
        size: i.size,
        stock: i.variant?.stock ?? 0,
      }));

    // Atomic transaction: pre-flight stock + decrement + mark PAID
    await prisma.$transaction(async (tx) => {
      // Pre-flight: stock check
      for (const item of order.items) {
        if (!item.variantId) continue;
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { stock: true },
        });
        if (!variant || variant.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for variant ${item.variantId} (need ${item.quantity}, have ${variant?.stock ?? 0})`
          );
        }
      }

      // Decrement
      for (const item of order.items) {
        if (!item.variantId) continue;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Mark PAID
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          paypalCaptureId: `MOCK-${Date.now()}`,
          paypalPayerEmail: order.customerEmail,
          paidAt: new Date(),
          paymentResponse: JSON.stringify({
            mock: true,
            capturedAt: new Date().toISOString(),
          }),
        },
      });
    });

    // Generate tracking token + persist hash (1-year TTL)
    const { token: rawTrackingToken, hash: trackingTokenHash, expiresAt } =
      issueOrderTrackingToken();
    await prisma.order.update({
      where: { id: order.id },
      data: {
        trackingToken: trackingTokenHash,
        trackingTokenExpiresAt: expiresAt,
      },
    });

    // Send confirmation email
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://heuse-production-9203.up.railway.app";
    const emailResult = await sendOrderConfirmation({
      email: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      total: Number(order.total),
      items: order.items.map((i) => ({
        name: i.name,
        size: i.size,
        quantity: i.quantity,
        price: Number(i.price),
      })),
      siteUrl,
      trackingToken: rawTrackingToken,
    });

    // Read stock AFTER (for verification)
    const stockAfter = await Promise.all(
      order.items
        .filter((i) => i.variantId)
        .map(async (i) => ({
          variantId: i.variantId!,
          size: i.size,
          stock:
            (await prisma.productVariant.findUnique({
              where: { id: i.variantId! },
              select: { stock: true },
            }))?.stock ?? 0,
        }))
    );

    // Get view token for completeness (issued at order create, stored as hash)
    const viewTokenInfo = await prisma.order.findUnique({
      where: { id: order.id },
      select: { viewToken: true, viewTokenExpiresAt: true },
    });

    return NextResponse.json({
      ok: true,
      mock: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentStatus: "PAID",
      orderStatus: "CONFIRMED",
      stockBefore,
      stockAfter,
      email: {
        sent: emailResult !== null,
        messageId: emailResult?.id,
        to: order.customerEmail,
      },
      tracking: {
        token: rawTrackingToken,
        url: `${siteUrl}/track/${encodeURIComponent(order.orderNumber)}?token=${rawTrackingToken}`,
      },
      note:
        "✅ Mock capture complete. DB updated, stock decremented, email sent. To revert, call /api/admin/mock-capture-cleanup with orderId.",
    });
  } catch (err) {
    console.error("[mock-capture]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
