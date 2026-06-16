import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder, getPayPalClientId } from "@/lib/paypal";

/**
 * Create a PayPal order for an existing internal order.
 *
 * POST /api/paypal/create-order
 * Body: { orderId: string }
 *
 * Returns: { paypalOrderId, approvalUrl, clientId }
 *
 * IMPORTANT: Order must already exist in DB (created via createOrder action).
 * This endpoint only initiates the PayPal transaction.
 */
export async function POST(req: NextRequest) {
  try {
    const { orderId, viewToken } = (await req.json()) as {
      orderId: string;
      // Optional: the viewToken for this order. Required for retry flows
      // so the PayPal return_url includes the token (success page auth).
      viewToken?: string;
    };
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Order already paid" },
        { status: 400 }
      );
    }

    // Currency: use IDR for HEUSE (Indonesian brand)
    const currency = process.env.PAYPAL_DEFAULT_CURRENCY || "IDR";
    const total = Number(order.total).toFixed(currency === "IDR" ? 0 : 2);

    // Build return/cancel URLs with the viewToken (if provided) so the
    // success page can authenticate. For first-time creation the token
    // is passed by the server action; for retries the client must supply
    // it from sessionStorage.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const tokenSuffix = viewToken
      ? `?viewToken=${encodeURIComponent(viewToken)}`
      : "";
    const returnUrl = `${siteUrl}/checkout/success/${order.orderNumber}${tokenSuffix}`;
    const cancelUrl = `${siteUrl}/checkout/cancel/${order.orderNumber}${tokenSuffix}`;

    const paypalOrder = await createPayPalOrder({
      orderNumber: order.orderNumber,
      amount: total,
      currency,
      customer: {
        email: order.customerEmail,
        name: order.customerName,
      },
      items: order.items.map((item) => ({
        id: item.productId || item.id,
        name: item.name,
        description: `Size: ${item.size}`,
        unitAmount: Number(item.price).toFixed(currency === "IDR" ? 0 : 2),
        quantity: item.quantity,
      })),
      urls: { returnUrl, cancelUrl },
    });

    // Find the approval URL
    const approvalLink = paypalOrder.links.find((l) => l.rel === "approve");
    if (!approvalLink) {
      return NextResponse.json(
        { error: "No approval URL in PayPal response" },
        { status: 500 }
      );
    }

    // Persist PayPal order ID for tracking
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paypalOrderId: paypalOrder.id,
        paymentMethod: "PAYPAL",
      },
    });

    // SECURITY: The viewToken is already in the DB (hashed). For the retry
    // path, we can't return the raw token (it's hashed). The client must
    // have it from the original order creation. The PayPal create-order
    // call doesn't know about viewTokens.
    //
    // The client should already have the token in sessionStorage or in the
    // current URL. If not, they can refresh the page to get it re-issued
    // via the "Refresh Status" link (which keeps the existing token).

    return NextResponse.json({
      paypalOrderId: paypalOrder.id,
      approvalUrl: approvalLink.href,
      clientId: getPayPalClientId(),
    });
  } catch (error) {
    // Log full error server-side; return generic message to client
    // (NEVER expose error.message/stack to client — info leak)
    console.error("[paypal-create-order]", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 }
    );
  }
}
