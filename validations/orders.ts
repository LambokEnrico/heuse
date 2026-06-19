import { z } from "zod";

export const createOrderSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customer: z.object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    phone: z.string().min(8).max(32),
    addressLine1: z.string().min(10).max(240),
    city: z.string().min(2).max(80),
    province: z.string().min(2).max(80),
    postalCode: z.string().max(12).optional(),
    country: z.string().min(2).max(80),
  }),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        variantId: z.string().cuid(),
        quantity: z.coerce.number().int().min(1).max(5),
      })
    )
    .min(1),
  notes: z.string().max(500).optional(),
  // Optional discount code (validated + applied server-side)
  discountCode: z.string().min(1).max(64).optional(),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().cuid(),
  status: z.enum(["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]).optional(),
  fulfillmentStatus: z
    .enum(["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"])
    .optional(),
  internalNote: z.string().max(1000).optional(),
  trackingNumber: z.string().max(120).optional(),
  trackingCarrier: z.string().max(60).optional(),
});

/**
 * Refund an already-paid order via PayPal.
 *
 * - `amount` is in the order's original currency (e.g. IDR). Optional;
 *   if omitted, a full refund is issued.
 * - `reason` is a free-text note shown to the customer on PayPal side
 *   and stored on the order for audit.
 */
export const refundOrderSchema = z.object({
  orderId: z.string().cuid(),
  amount: z.coerce.number().positive().max(100_000_000).optional(),
  reason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;

/**
 * Mark an order as shipped — sets tracking number + carrier, transitions
 * fulfillmentStatus to SHIPPED, and stamps shippedAt timestamp.
 *
 * Use case: admin clicks "Mark as Shipped" in the order detail page after
 * creating a shipment with the carrier. The tracking info then appears on
 * the customer's /track page and triggers a shipping-notification email.
 */
export const shipOrderSchema = z.object({
  orderId: z.string().cuid(),
  trackingNumber: z.string().min(2).max(120),
  trackingCarrier: z.string().min(2).max(60),
  notifyCustomer: z.coerce.boolean().default(true),
});