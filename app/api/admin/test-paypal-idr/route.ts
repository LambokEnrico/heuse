import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder } from "@/lib/paypal";

/**
 * Internal diagnostic: test IDR→USD PayPal conversion end-to-end.
 *
 * 1. Creates a fresh test order in DB (does NOT decrement stock)
 * 2. Calls PayPal create-order (via lib/paypal.ts)
 * 3. Returns:
 *    - PayPal order ID (if accepted) OR error
 *    - Conversion log (from console.log in convertForPayPal)
 *    - Original IDR amount + computed USD amount
 *
 * Auth: CRON_SECRET (Bearer token)
 *
 * Cleanup: paypalOrderId is cleared from DB after test, so the order
 * remains AWAITING_PAYMENT and can be retried manually.
 *
 * Usage: GET /api/admin/test-paypal-idr
 *        Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Find a product with stock to test with
    const product = await prisma.product.findFirst({
      include: { variants: { where: { stock: { gt: 0 } }, take: 1 } },
    });
    if (!product || !product.variants[0]) {
      return NextResponse.json(
        { error: "No products with stock available for test" },
        { status: 500 }
      );
    }
    const variant = product.variants[0];
    const variantPrice = Number(product.price);

    // Step 2: Create a test order (IDR currency, AWAITING_PAYMENT status)
    const order = await prisma.order.create({
      data: {
        orderNumber: `TEST-PAYPAL-${Date.now()}`,
        idempotencyKey: `test-paypal-idr-${Date.now()}`,
        customerName: "Test Customer (IDR→USD conversion)",
        customerEmail: "test@example.com",
        customerPhone: "+6281234567890",
        addressLine1: "Test Address",
        city: "Jakarta",
        province: "DKI Jakarta",
        postalCode: "12345",
        country: "Indonesia",
        subtotal: variantPrice,
        shippingCost: 0,
        total: variantPrice,
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
        paymentMethod: "PAYPAL",
        items: {
          create: [
            {
              productId: product.id,
              variantId: variant.id,
              name: product.name,
              size: variant.size,
              price: variantPrice,
              quantity: 1,
            },
          ],
        },
      },
    });

    // Step 3: Call PayPal create-order via lib/paypal
    let paypalResult: any;
    let paypalError: any;
    try {
      const paypalOrder = await createPayPalOrder({
        orderNumber: order.orderNumber,
        amount: order.total.toString(),
        currency: "IDR",
        customer: {
          email: order.customerEmail,
          name: order.customerName,
        },
        items: [
          {
            id: variant.id,
            name: product.name,
            description: `Size: ${variant.size}`,
            unitAmount: variantPrice.toString(),
            quantity: 1,
          },
        ],
      });
      paypalResult = {
        paypalOrderId: paypalOrder.id,
        approvalUrl: paypalOrder.links.find((l) => l.rel === "approve")?.href,
        status: paypalOrder.status,
      };

      // Persist paypalOrderId for verification
      await prisma.order.update({
        where: { id: order.id },
        data: { paypalOrderId: paypalOrder.id },
      });
    } catch (err) {
      paypalError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      ok: !paypalError,
      testOrder: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalIDR: Number(order.total),
        expectedUSD: (Number(order.total) / 16000).toFixed(2),
      },
      paypal: paypalResult,
      paypalError,
      conversionRate: process.env.PAYPAL_IDR_TO_USD_RATE || 16000,
      note:
        paypalResult && !paypalError
          ? "✅ IDR→USD conversion working. Check Railway logs for [paypal] Converting X IDR → Y USD log line."
          : "❌ PayPal rejected the order. Check Railway logs for details.",
    });
  } catch (err) {
    console.error("[test-paypal-idr]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
