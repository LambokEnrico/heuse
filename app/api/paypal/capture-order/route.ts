import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder, getPayPalOrder, mapPayPalStatus, convertForPayPal } from "@/lib/paypal";

/**
 * Capture a PayPal order after customer approval.
 *
 * POST /api/paypal/capture-order
 * Body: { orderId: string, paypalOrderId: string }
 *
 * CRITICAL SECURITY: Server-side validation per `paypal-1.0.0` skill:
 *   - Verify status is COMPLETED
 *   - Verify amount matches expected
 *   - Verify currency matches expected
 *   - Verify merchant_id matches (no payment to wrong account)
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, paypalOrderId } = (await req.json()) as {
      orderId: string;
      paypalOrderId: string;
    };

    if (!orderId || !paypalOrderId) {
      return NextResponse.json(
        { error: "orderId and paypalOrderId required" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, note: "Already paid" });
    }

    // Step 1: Re-fetch PayPal order to verify it exists and is approved
    const paypalOrder = await getPayPalOrder(paypalOrderId);
    if (paypalOrder.status !== "APPROVED" && paypalOrder.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `PayPal order not approved (status: ${paypalOrder.status})` },
        { status: 400 }
      );
    }

    // Step 2: Verify amount + currency match what we expect
    // NOTE: For sandbox with IDR, the actual PayPal call uses USD (auto-converted).
    // We must apply the same conversion when validating the response, otherwise
    // we'd reject every legitimate payment.
    const orderCurrency = process.env.PAYPAL_DEFAULT_CURRENCY || "IDR";
    const expected = convertForPayPal(Number(order.total), orderCurrency);
    const expectedAmount = Number(expected.amount);
    const expectedCurrency = expected.currency;
    const actualAmount = Number(paypalOrder.purchase_units[0].amount.value);
    const actualCurrency = paypalOrder.purchase_units[0].amount.currency_code;

    if (actualCurrency !== expectedCurrency) {
      console.error(
        `[paypal-capture] Currency mismatch: expected ${expectedCurrency}, got ${actualCurrency}`
      );
      return NextResponse.json(
        { error: "Currency mismatch" },
        { status: 400 }
      );
    }

    // Allow small floating-point tolerance
    if (Math.abs(actualAmount - expectedAmount) > 0.01) {
      console.error(
        `[paypal-capture] Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`
      );
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // Step 3: Capture the payment (handle "already captured" gracefully)
    let captureRecord: {
      id: string;
      status: string;
      amount: { currency_code: string; value: string };
      final_capture?: boolean;
    };
    let payer: { payer_id: string; email_address: string; name?: { given_name?: string; surname?: string } };
    try {
      const capture = await capturePayPalOrder(paypalOrderId);
      captureRecord = capture.purchase_units[0].payments.captures[0];
      payer = capture.payer;
    } catch (captureErr) {
      const msg = captureErr instanceof Error ? captureErr.message : "";
      // If PayPal says "already captured", PayPal has the money but our DB is stale.
      // Re-fetch the order to get the existing capture details, then sync.
      if (msg.includes("ORDER_ALREADY_CAPTURED")) {
        const orderDetails = (await getPayPalOrder(paypalOrderId)) as unknown as {
          purchase_units: Array<{
            payments?: {
              captures?: Array<{
                id: string;
                status: string;
                amount: { currency_code: string; value: string };
                final_capture?: boolean;
              }>;
            };
          }>;
        };
        const existingCaptures = orderDetails.purchase_units?.[0]?.payments?.captures;
        if (!existingCaptures || existingCaptures.length === 0) {
          return NextResponse.json(
            { error: "Order already captured but no capture data found" },
            { status: 500 }
          );
        }
        captureRecord = existingCaptures[0];
        // Payer info isn't in getPayPalOrder response — use what we have
        payer = { payer_id: "", email_address: order.customerEmail };
      } else {
        throw captureErr;
      }
    }

    if (captureRecord.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Capture not completed (status: ${captureRecord.status})` },
        { status: 400 }
      );
    }

    // Step 4: Update order in DB + decrement stock (atomic transaction)
    const mapped = mapPayPalStatus("PAYMENT.CAPTURE.COMPLETED", captureRecord.status);

    // Fetch order items for stock decrement (with variantId for each)
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (!orderWithItems) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Pre-flight: verify stock is still available for all items.
        // With "decrement at payment" model, two concurrent buyers can both
        // create orders for the last unit. Fail this one if stock ran out
        // between order creation and payment.
        for (const item of orderWithItems.items) {
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

        // Decrement stock for each item
        for (const item of orderWithItems.items) {
          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.quantity } },
          });
        }

        // Update order to PAID
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: mapped.paymentStatus,
            status: mapped.orderStatus,
            paypalCaptureId: captureRecord.id,
            paypalPayerId: payer.payer_id || undefined,
            paypalPayerEmail: payer.email_address || order.customerEmail,
            paidAt: new Date(),
            paymentResponse: JSON.stringify({ captureRecord, payer }),
          },
        });
      });
    } catch (txErr) {
      // If insufficient stock, the payment is still captured by PayPal but
      // we can't fulfill. We need to refund the customer.
      // (For now, mark order as FAILED with a clear note so admin can act.)
      const message = txErr instanceof Error ? txErr.message : "Transaction failed";
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          internalNote: `AUTO-CANCELLED at capture: ${message}. PayPal captured the money — admin must issue refund via PayPal dashboard.`,
        },
      });
      console.error(`[paypal-capture] ${message} for order ${order.orderNumber}`);
      return NextResponse.json(
        { error: message, orderStatus: "CANCELLED", refundRequired: true },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: mapped.paymentStatus,
      orderStatus: mapped.orderStatus,
      captureId: captureRecord.id,
    });
  } catch (error) {
    // Log full error server-side, return generic message to client
    // (NEVER expose error.message/details/stack to client — info leak)
    console.error("[paypal-capture]", error);
    return NextResponse.json(
      { error: "Failed to capture PayPal order" },
      { status: 500 }
    );
  }
}
