"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  refundOrderSchema,
} from "@/validations/orders";
import { requireRole } from "@/lib/permissions";
import { generateOrderNumber } from "@/lib/utils";
import { createPayPalOrder, refundPayPalOrder } from "@/lib/paypal";
import { issueOrderViewToken } from "@/lib/order-token";
import { auditLog } from "@/lib/audit";
import { sendOrderCancelled } from "@/lib/email";
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
      // Idempotency: same idempotencyKey submitted again (e.g. double-click,
      // browser retry, network re-submit). Re-fetch the PayPal order to
      // get its current approval URL. If PayPal order is no longer
      // approvable (captured/voided), redirect to the success page so the
      // client can render the latest order status.
      if (existing.paypalOrderId) {
        const { getPayPalOrder } = await import("@/lib/paypal");
        try {
          const paypalOrder = await getPayPalOrder(existing.paypalOrderId);
          const approvalLink = paypalOrder.links.find((l) => l.rel === "approve");
          if (approvalLink) {
            return {
              success: true,
              data: {
                orderId: existing.id,
                orderNumber: existing.orderNumber,
                paypalOrderId: existing.paypalOrderId,
                approvalUrl: approvalLink.href,
                total: Number(existing.total),
                viewToken: null, // Re-use from original response
              },
            };
          }
        } catch {
          // Fall through to success URL fallback
        }
        // Fallback: PayPal order is no longer approvable. Point client at
        // the success page so they see the current status (or the cancel
        // page if needed).
        return {
          success: true,
          data: {
            orderId: existing.id,
            orderNumber: existing.orderNumber,
            paypalOrderId: existing.paypalOrderId,
            approvalUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/checkout/success/${existing.orderNumber}`,
            total: Number(existing.total),
            viewToken: null,
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
        // NOTE: Stock is NOT decremented at order creation.
        // Decrement happens at payment success (in /api/paypal/capture-order
        // and /api/paypal/webhook). This prevents unpaid reservations from
        // locking inventory — see the docs/orders.md for the full flow.
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
      // Use 'viewToken' (not 'token') to avoid collision with PayPal's own
      // ?token={PAYPAL_ORDER_ID}&PayerID=… that PayPal appends on redirect.
      const returnUrl = `${siteUrl}/checkout/success/${newOrder.orderNumber}?viewToken=${encodeURIComponent(viewToken)}`;
      const cancelUrl = `${siteUrl}/checkout/cancel/${newOrder.orderNumber}?viewToken=${encodeURIComponent(viewToken)}`;

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

    // If cancelling, release reserved stock on productVariant
    // (NOTE: this is the canonical release path for admin-cancelled orders.
    // editionUnit release was buggy because EditionUnit rows may not exist
    // for orders created before the EditionUnit migration. productVariant.stock
    // is the source of truth for the storefront.)
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      const orderWithItems = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      await prisma.$transaction(async (tx) => {
        // Release stock on productVariant (atomic with order update)
        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        }

        // Best-effort release of editionUnit (only relevant for orders that
        // had EditionUnit rows linked — most don't)
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

/**
 * Manually release stock for an unpaid order.
 *
 * Use case: an order is stuck in AWAITING_PAYMENT + UNPAID state and
 * stock should be returned to the catalog before the 24h cron releases it.
 * (E.g., admin knows the customer abandoned the checkout.)
 *
 * Refuses to act on:
 *   - PAID orders (stock is already committed; refund instead)
 *   - REFUNDED orders (stock already released)
 *   - CANCELLED orders (already released by cron or previous action)
 *
 * Idempotent: re-running on a cancelled order returns ALREADY_CANCELLED.
 */
export async function releaseOrderStock(input: unknown): Promise<ActionResponse<{ orderId: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = z
      .object({ orderId: z.string().cuid() })
      .safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid orderId" },
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
    }

    if (order.status === "CANCELLED") {
      return {
        success: false,
        error: { code: "ALREADY_CANCELLED", message: "Order is already cancelled" },
      };
    }

    if (order.paymentStatus !== "UNPAID") {
      return {
        success: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot release stock for ${order.paymentStatus} order. Use refund flow instead.`,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      // Release stock on productVariant (atomic with order update)
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      // Best-effort editionUnit release (most orders don't have these)
      await tx.editionUnit.updateMany({
        where: { orderItem: { orderId: order.id } },
        data: { status: "AVAILABLE", orderItemId: null },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          internalNote: (order.internalNote ? order.internalNote + "\n" : "") +
            `[Stock released manually by admin ${new Date().toISOString()}]`,
        },
      });
    });

    await auditLog({
      action: "order.release_stock",
      resource: `Order:${order.id}`,
      details: {
        orderNumber: order.orderNumber,
        itemsReleased: order.items.length,
        reason: "manual_admin_release",
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.id}`);

    return { success: true, data: { orderId: order.id } };
  } catch (error) {
    console.error("[releaseOrderStock]", error);
    return {
      success: false,
      error: { code: "SERVER_ERROR", message: "Failed to release stock" },
    };
  }
}

/**
 * Issue a PayPal refund for a paid order.
 *
 * Flow:
 *  1. Verify admin
 *  2. Load order; reject if not PAID or already refunded, or no capture ID
 *  3. Validate amount (full refund if omitted; otherwise <= captured total)
 *  4. Call PayPal Refund API
 *  5. Atomically:
 *     - Update order: paymentStatus=REFUNDED, status=CANCELLED,
 *       refundedAt, refundAmount, refundReason, refundId
 *     - Release stock on productVariant (refunded = return to inventory)
 *  6. Send cancellation email with refunded: true
 *  7. Audit log
 *
 * If PayPal refund succeeds but DB write fails, we still return success
 * (money is refunded; admin can reconcile). The opposite is impossible:
 * we only mark refunded after PayPal returns success.
 */
export async function refundOrder(input: unknown): Promise<ActionResponse<{ orderId: string; refundId: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = refundOrderSchema.safeParse(input);
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

    const { orderId, amount, reason } = parsed.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      return { success: false, error: { code: "NOT_FOUND", message: "Order not found" } };
    }

    // State guards
    if (order.paymentStatus === "REFUNDED" || order.refundedAt) {
      return {
        success: false,
        error: {
          code: "ALREADY_REFUNDED",
          message: `Order already refunded at ${order.refundedAt?.toISOString() ?? "(unknown)"}.`,
        },
      };
    }
    if (order.paymentStatus !== "PAID") {
      return {
        success: false,
        error: {
          code: "INVALID_STATE",
          message: `Cannot refund order with paymentStatus=${order.paymentStatus}. Only PAID orders can be refunded.`,
        },
      };
    }
    if (!order.paypalCaptureId) {
      return {
        success: false,
        error: {
          code: "NO_CAPTURE",
          message:
            "Order has no PayPal capture ID. Refund is only supported for orders paid via PayPal.",
        },
      };
    }

    // Amount validation (for partial refunds)
    const orderTotal = Number(order.total);
    if (amount !== undefined && amount > orderTotal) {
      return {
        success: false,
        error: {
          code: "AMOUNT_TOO_HIGH",
          message: `Refund amount (${amount}) exceeds order total (${orderTotal}).`,
        },
      };
    }

    // Call PayPal Refund API
    const currency = process.env.PAYPAL_DEFAULT_CURRENCY || "IDR";
    const isZeroDecimal = ["IDR", "JPY", "TWD", "KRW", "VND"].includes(currency);
    const amountString =
      amount !== undefined
        ? isZeroDecimal
          ? Math.round(amount).toString()
          : amount.toFixed(2)
        : undefined;

    let refund;
    try {
      refund = await refundPayPalOrder({
        captureId: order.paypalCaptureId,
        amount: amountString,
        currency,
        noteToPayer: reason
          ? `Order ${order.orderNumber}: ${reason.slice(0, 100)}`
          : `Refund for order ${order.orderNumber}`,
      });
    } catch (paypalError) {
      console.error("[refundOrder] PayPal refund failed:", paypalError);
      return {
        success: false,
        error: {
          code: "PAYPAL_REFUND_FAILED",
          message:
            paypalError instanceof Error
              ? paypalError.message
              : "PayPal refund request failed. Order is NOT marked as refunded.",
        },
      };
    }

    if (refund.status !== "COMPLETED" && refund.status !== "PENDING") {
      // FAILED / CANCELLED - don't update DB
      return {
        success: false,
        error: {
          code: "REFUND_NOT_COMPLETED",
          message: `PayPal returned status=${refund.status}. Order is NOT marked as refunded.`,
        },
      };
    }

    // Compute refund amount in our internal currency
    // (PayPal returns the amount in capture currency; we store in original)
    const refundAmountStored = amount !== undefined ? amount : orderTotal;

    // Atomic: update order + release stock
    await prisma.$transaction(async (tx) => {
      // Release stock (refund = return to inventory)
      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      // Best-effort editionUnit release
      await tx.editionUnit.updateMany({
        where: { orderItem: { orderId: order.id } },
        data: { status: "AVAILABLE", orderItemId: null },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "REFUNDED",
          status: "CANCELLED",
          refundedAt: new Date(),
          refundAmount: refundAmountStored,
          refundReason: reason ?? null,
          refundId: refund.id,
          internalNote:
            (order.internalNote ? order.internalNote + "\n" : "") +
            `[Refunded ${refundAmountStored} on ${new Date().toISOString()} via PayPal refund ${refund.id}${reason ? ` — ${reason}` : ""}]`,
        },
      });
    });

    await auditLog({
      action: "order.refund",
      resource: `Order:${order.id}`,
      details: {
        orderNumber: order.orderNumber,
        refundAmount: refundAmountStored,
        refundId: refund.id,
        paypalStatus: refund.status,
        reason: reason ?? null,
      },
    });

    // Send cancellation/refund email (fire-and-forget; failures shouldn't block)
    try {
      await sendOrderCancelled({
        email: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        reason: reason ?? "Refund processed by merchant",
        refunded: true,
      });
    } catch (emailError) {
      console.error("[refundOrder] Failed to send refund email:", emailError);
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.id}`);

    return {
      success: true,
      data: { orderId: order.id, refundId: refund.id },
    };
  } catch (error) {
    console.error("[refundOrder]", error);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Failed to process refund. Please contact support if money was sent.",
      },
    };
  }
}
