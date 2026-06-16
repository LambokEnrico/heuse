"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createOrderSchema, updateOrderStatusSchema } from "@/validations/orders";
import { requireRole } from "@/lib/permissions";
import { generateOrderNumber } from "@/lib/utils";
import { createPayPalOrder } from "@/lib/paypal";
import { issueOrderViewToken } from "@/lib/order-token";
import { auditLog } from "@/lib/audit";
import type { ActionResponse } from "@/types";

/**
 * How long an order is reserved before the cron job releases its stock
 * back to the catalog. 24 hours is enough for users to complete PayPal
 * checkout and reasonable for a luxury item (vs. flash sales where you
 * might want 15 minutes).
 */
const ORDER_RESERVATION_HOURS = 24;

/**
 * Create an internal order (no payment yet).
 */
export async function createOrder(input: unknown): Promise<ActionResponse<{ orderId: string; orderNumber: string; viewToken: string | null }>> {
  try {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { idempotencyKey, customer, items, notes } = parsed.data;

    // Check idempotency - return existing order if duplicate
    const existingOrder = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    });
    if (existingOrder) {
      // For duplicates, the client already has the viewToken from the first call.
      // Return null and let the client use what it has.
      return {
        success: true,
        data: {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          viewToken: null,
        },
      };
    }

    // Validate all products and variants exist
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: { where: { id: item.variantId } } },
      });
      if (!product || product.status !== "PUBLISHED") {
        return {
          success: false,
          error: { code: "PRODUCT_UNAVAILABLE", message: `Product is no longer available` },
        };
      }
      if (product.variants.length === 0) {
        return {
          success: false,
          error: { code: "VARIANT_UNAVAILABLE", message: `Selected size is no longer available` },
        };
      }
    }

    // Use Prisma transaction for atomic order creation
    const { newOrder, viewToken } = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: Array<{
        productId: string;
        variantId: string;
        name: string;
        size: string;
        price: number;
        quantity: number;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: { where: { id: item.variantId } } },
        });

        if (!product || product.variants.length === 0) {
          throw new Error(`Product or variant not available`);
        }

        const variant = product.variants[0];
        const itemPrice = Number(product.price);
        subtotal += itemPrice * item.quantity;

        orderItemsData.push({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          size: variant.size,
          price: itemPrice,
          quantity: item.quantity,
        });
      }

      const orderNumber = generateOrderNumber();
      const { token: viewToken, hash: viewTokenHash, expiresAt: viewTokenExpiresAt } =
        issueOrderViewToken();
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          addressLine1: customer.addressLine1,
          city: customer.city,
          province: customer.province,
          postalCode: customer.postalCode,
          country: customer.country,
          notes,
          subtotal,
          total: subtotal,
          status: "PENDING_CONFIRMATION",
          paymentStatus: "UNPAID",
          fulfillmentStatus: "UNFULFILLED",
          viewToken: viewTokenHash,
          viewTokenExpiresAt,
        },
      });

      for (const itemData of orderItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: itemData.productId,
            variantId: itemData.variantId,
            name: itemData.name,
            size: itemData.size,
            price: itemData.price,
            quantity: itemData.quantity,
          },
        });
      }

      return { newOrder, viewToken };
    });

    revalidatePath("/cart");
    revalidatePath("/checkout");
    revalidatePath("/admin/orders");

    return { success: true, data: { orderId: newOrder.id, orderNumber: newOrder.orderNumber, viewToken } };
  } catch (error) {
    console.error("[createOrder]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create order. Please try again." } };
  }
}

/**
 * Create order + PayPal order in one atomic call.
 *
 * Flow:
 *  1. Validate input, check idempotency
 *  2. Create order in DB (AWAITING_PAYMENT)
 *  3. Decrement variant stock
 *  4. Create PayPal order (server-to-server)
 *  5. Persist paypalOrderId on our order
 *  6. Return approvalUrl for frontend to redirect
 */
export async function createOrderWithPayPalPayment(input: unknown): Promise<
  ActionResponse<{
    orderId: string;
    orderNumber: string;
    paypalOrderId: string;
    approvalUrl: string;
    total: number;
    viewToken: string | null;
  }>
> {
  try {
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { idempotencyKey, customer, items, notes } = parsed.data;

    // Idempotency
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true },
    });
    if (existing) {
      // Return existing approval URL if we already created a PayPal order.
      // For duplicate calls we can't return the original raw viewToken
      // (it's hashed in DB) — clients should re-use the value from the
      // first response. We surface a hint to make this obvious.
      if (existing.paypalOrderId) {
        return {
          success: true,
          data: {
            orderId: existing.id,
            orderNumber: existing.orderNumber,
            paypalOrderId: existing.paypalOrderId,
            approvalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/checkout/pay/${existing.id}`,
            total: Number(existing.total),
            viewToken: null, // Re-use from original response
          },
        };
      }
    }

    // Validate + create order + decrement stock atomically
    const { newOrder, total, orderItemsData, viewToken } = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsData: Array<{
        productId: string;
        variantId: string;
        name: string;
        size: string;
        price: number;
        quantity: number;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: { where: { id: item.variantId } } },
        });
        if (!product || product.status !== "PUBLISHED") {
          throw new Error(`Product not available`);
        }
        const variant = product.variants[0];
        if (!variant) {
          throw new Error(`Size not available`);
        }
        if (variant.stock < item.quantity) {
          throw new Error(
            `Only ${variant.stock} of size ${variant.size} available — not enough for quantity ${item.quantity}`
          );
        }

        const itemPrice = Number(product.price);
        subtotal += itemPrice * item.quantity;

        orderItemsData.push({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          size: variant.size,
          price: itemPrice,
          quantity: item.quantity,
        });
      }

      const orderNumber = generateOrderNumber();
      const shippingCost = 0;
      const total = subtotal + shippingCost;

      // Issue a view token so the success page can verify ownership.
      // The HASH is stored in the DB; the RAW token is returned to the
      // client and embedded in the PayPal return_url.
      const { token: viewToken, hash: viewTokenHash, expiresAt: viewTokenExpiresAt } =
        issueOrderViewToken();
      // 24-hour reservation: if PayPal isn't completed in time, the cron
      // job releases the stock back to the catalog (see /api/cron/release-stock).
      const expiredAt = new Date(Date.now() + ORDER_RESERVATION_HOURS * 60 * 60 * 1000);

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          idempotencyKey,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          addressLine1: customer.addressLine1,
          city: customer.city,
          province: customer.province,
          postalCode: customer.postalCode,
          country: customer.country,
          notes,
          subtotal,
          shippingCost,
          total,
          status: "AWAITING_PAYMENT",
          paymentStatus: "UNPAID",
          fulfillmentStatus: "UNFULFILLED",
          paymentMethod: "PAYPAL",
          viewToken: viewTokenHash,
          viewTokenExpiresAt,
          expiredAt,
        },
      });

      for (const it of orderItemsData) {
        await tx.orderItem.create({ data: { orderId: newOrder.id, ...it } });
        await tx.productVariant.update({
          where: { id: it.variantId },
          data: { stock: { decrement: it.quantity } },
        });
      }

      return { newOrder, total, orderItemsData, viewToken };
    });

    // Create PayPal order. If PayPal is down, we still have the order
    // recorded as AWAITING_PAYMENT — admin can mark cancelled.
    const currency = process.env.PAYPAL_DEFAULT_CURRENCY || "IDR";
    const isZeroDecimal = ["IDR", "JPY", "TWD", "KRW", "VND"].includes(currency);

    let paypalOrderId: string;
    let approvalUrl: string;

    try {
      // Build return_url with the viewToken so PayPal redirects back with it.
      // This avoids requiring sessionStorage (which may be cleared on some
      // mobile browsers) and gives the success page a reliable verification
      // mechanism.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const returnUrl = `${siteUrl}/checkout/success/${newOrder.orderNumber}?token=${encodeURIComponent(viewToken)}`;
      const cancelUrl = `${siteUrl}/checkout/cancel/${newOrder.orderNumber}?token=${encodeURIComponent(viewToken)}`;

      const paypalOrder = await createPayPalOrder({
        orderNumber: newOrder.orderNumber,
        amount: total.toFixed(isZeroDecimal ? 0 : 2),
        currency,
        customer: {
          email: newOrder.customerEmail,
          name: newOrder.customerName,
        },
        items: orderItemsData.map((it) => ({
          id: it.productId,
          name: it.name,
          description: `Size: ${it.size}`,
          unitAmount: it.price.toFixed(isZeroDecimal ? 0 : 2),
          quantity: it.quantity,
        })),
        urls: { returnUrl, cancelUrl },
      });

      const approvalLink = paypalOrder.links.find((l) => l.rel === "approve");
      if (!approvalLink) {
        throw new Error("No approval URL in PayPal response");
      }

      paypalOrderId = paypalOrder.id;
      approvalUrl = approvalLink.href;

      await prisma.order.update({
        where: { id: newOrder.id },
        data: { paypalOrderId },
      });
    } catch (paypalError) {
      console.error("[PayPal] Failed to create order:", paypalError);
      return {
        success: false,
        error: {
          code: "PAYMENT_INIT_FAILED",
          message:
            "Order saved but PayPal is unavailable. Please try again in a moment. Order ID: " +
            newOrder.orderNumber,
        },
      };
    }

    revalidatePath("/admin/orders");

    return {
      success: true,
      data: {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        paypalOrderId,
        approvalUrl,
        total,
        viewToken, // raw token — used by success page
      },
    };
  } catch (error) {
    console.error("[createOrderWithPayPalPayment]", error);
    return {
      success: false,
      error: {
        code: error instanceof Error ? "ORDER_FAILED" : "SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create order. Please try again.",
      },
    };
  }
}

/**
 * Re-check payment status from PayPal (in case webhook was missed).
 * Fetches the latest PayPal order status and updates our DB.
 */
export async function checkOrderPaymentStatus(
  input: unknown
): Promise<ActionResponse<{ paymentStatus: string; orderStatus: string }>> {
  try {
    const parsed = z
      .object({ orderId: z.string().min(1) })
      .safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Missing orderId" },
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
    });
    if (!order) {
      return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
    }

    // Already paid? Just return.
    if (order.paymentStatus === "PAID") {
      return {
        success: true,
        data: { paymentStatus: order.paymentStatus, orderStatus: order.status },
      };
    }

    if (!order.paypalOrderId) {
      return {
        success: true,
        data: { paymentStatus: order.paymentStatus, orderStatus: order.status },
      };
    }

    // Re-fetch from PayPal to check status
    const { getPayPalOrder, mapPayPalStatus, capturePayPalOrder } = await import("@/lib/paypal");
    const paypalOrder = await getPayPalOrder(order.paypalOrderId);

    if (paypalOrder.status === "APPROVED" && !order.paypalCaptureId) {
      // Customer approved but didn't return — capture on their behalf
      const capture = await capturePayPalOrder(order.paypalOrderId);
      const captureRecord = capture.purchase_units[0].payments.captures[0];
      const mapped = mapPayPalStatus("PAYMENT.CAPTURE.COMPLETED", captureRecord.status);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: mapped.paymentStatus,
          status: mapped.orderStatus,
          paypalCaptureId: captureRecord.id,
          paypalPayerId: capture.payer.payer_id,
          paypalPayerEmail: capture.payer.email_address,
          paidAt: new Date(),
          paymentResponse: JSON.stringify(capture),
        },
      });

      return {
        success: true,
        data: { paymentStatus: mapped.paymentStatus, orderStatus: mapped.orderStatus },
      };
    }

    return {
      success: true,
      data: { paymentStatus: order.paymentStatus, orderStatus: order.status },
    };
  } catch (error) {
    console.error("[checkOrderPaymentStatus]", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to check payment status" },
    };
  }
}

export async function updateOrderStatus(input: unknown): Promise<ActionResponse<{ orderId: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = updateOrderStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { orderId, status, paymentStatus, fulfillmentStatus, internalNote } = parsed.data;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
    }

    // If cancelling, release reserved units
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        await tx.editionUnit.updateMany({
          where: { orderItem: { orderId } },
          data: { status: "AVAILABLE", orderItemId: null },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            status,
            paymentStatus: paymentStatus || order.paymentStatus,
            fulfillmentStatus: fulfillmentStatus || order.fulfillmentStatus,
            internalNote: internalNote !== undefined ? internalNote : order.internalNote,
          },
        });
      });
    } else {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          paymentStatus: paymentStatus || undefined,
          fulfillmentStatus: fulfillmentStatus || undefined,
          internalNote: internalNote !== undefined ? internalNote : undefined,
        },
      });
    }

    await auditLog({
      action: "order.update_status",
      resource: `Order:${orderId}`,
      details: {
        orderNumber: order.orderNumber,
        previous: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
        },
        new: { status, paymentStatus, fulfillmentStatus },
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, data: { orderId } };
  } catch (error) {
    console.error("[updateOrderStatus]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update order" } };
  }
}
