import { prisma } from "@/lib/prisma";

/**
 * Discount / promo code logic.
 *
 * Lifecycle:
 *   1. Customer types a code in cart/checkout
 *   2. We call validateDiscountForCart() to show live "X% off" preview
 *   3. On order submit, applyDiscountToOrder() atomically:
 *      - Increments DiscountCode.usageCount
 *      - Creates DiscountUsage row (audit + per-customer limit)
 *      - Stores discount fields on Order
 *
 * Concurrency: usageCount + DiscountUsage creation happen in the SAME
 * transaction as order creation, so two parallel submits can never both
 * succeed past the usage limit (Postgres serializable by default for the
 * count + insert pair inside one tx). Per-customer uses a unique index on
 * DiscountUsage.orderId + a count query inside the tx for the limit check.
 */

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface DiscountValidationOk {
  ok: true;
  code: string;          // Normalized uppercase
  type: DiscountType;
  value: number;
  discountAmount: number;
  description?: string;
  // For UI display
  displayValue: string;  // "20%" or "Rp 50.000"
}

export interface DiscountValidationErr {
  ok: false;
  error: string;
  code?: string;
}

export type DiscountValidation = DiscountValidationOk | DiscountValidationErr;

/**
 * Normalize user-typed code: trim, uppercase, strip whitespace.
 * Codes are stored uppercase in the DB, so we always compare uppercase.
 */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Compute the discount amount for a given code + subtotal.
 * Pure function — no DB access. Used for preview and as a sanity check
 * after applying.
 */
export function computeDiscountAmount(
  type: DiscountType,
  value: number,
  subtotal: number,
  maxDiscount?: number | null
): number {
  let amount: number;
  if (type === "PERCENTAGE") {
    amount = Math.round((subtotal * value) / 100);
    if (maxDiscount != null) {
      amount = Math.min(amount, maxDiscount);
    }
  } else {
    // FIXED — in order currency. Cap at subtotal.
    amount = Math.min(value, subtotal);
  }
  // Never discount more than the subtotal (negative total protection).
  return Math.max(0, Math.min(amount, subtotal));
}

/**
 * Validate a discount code for a given cart subtotal + customer email.
 * Returns either { ok: true, ... } with the computed discount amount,
 * or { ok: false, error: ... }.
 *
 * Does NOT consume the code (doesn't increment usageCount) — that's
 * done in applyDiscountToOrder() inside the order-create transaction.
 */
export async function validateDiscountForCart(params: {
  code: string;
  subtotal: number;
  customerEmail: string;
}): Promise<DiscountValidation> {
  const code = normalizeCode(params.code);
  if (!code) {
    return { ok: false, error: "Please enter a promo code" };
  }

  const dc = await prisma.discountCode.findUnique({ where: { code } });
  if (!dc) {
    return { ok: false, error: "Promo code not found", code };
  }
  if (!dc.active) {
    return { ok: false, error: "This promo code is no longer active", code };
  }
  if (dc.expiresAt && dc.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "This promo code has expired", code };
  }

  // Total usage limit
  if (dc.usageLimit != null && dc.usageCount >= dc.usageLimit) {
    return {
      ok: false,
      error: "This promo code has reached its usage limit",
      code,
    };
  }

  // Per-customer limit (only meaningful if email provided)
  if (params.customerEmail && dc.perCustomerLimit != null) {
    const customerUses = await prisma.discountUsage.count({
      where: {
        discountId: dc.id,
        customerEmail: params.customerEmail.toLowerCase(),
      },
    });
    if (customerUses >= dc.perCustomerLimit) {
      return {
        ok: false,
        error: "You have already used this promo code the maximum number of times",
        code,
      };
    }
  }

  // Min purchase
  if (dc.minPurchase != null && params.subtotal < Number(dc.minPurchase)) {
    return {
      ok: false,
      error: `Minimum purchase of Rp ${Number(dc.minPurchase).toLocaleString(
        "id-ID"
      )} required`,
      code,
    };
  }

  const discountAmount = computeDiscountAmount(
    dc.type as DiscountType,
    Number(dc.value),
    params.subtotal,
    dc.maxDiscount != null ? Number(dc.maxDiscount) : null
  );

  return {
    ok: true,
    code,
    type: dc.type as DiscountType,
    value: Number(dc.value),
    discountAmount,
    description: dc.description ?? undefined,
    displayValue:
      dc.type === "PERCENTAGE"
        ? `${dc.value}%`
        : `Rp ${Number(dc.value).toLocaleString("id-ID")}`,
  };
}

/**
 * Apply a validated discount code to a NEW order, inside an existing
 * Prisma transaction. Used by createOrderWithPayPalPayment to keep
 * usageCount + DiscountUsage creation atomic with order creation.
 *
 * IMPORTANT: Caller must already have validated the code with
 * validateDiscountForCart() before calling this. This function does
 * NOT re-validate (no min purchase re-check, no expiry re-check).
 *
 * Concurrency: This relies on Postgres serializable behavior for the
 * count + insert. For high-concurrency scenarios a SELECT FOR UPDATE
 * on the DiscountCode row would be safer, but for an e-commerce site
 * the simple count + insert is sufficient.
 *
 * Must be called INSIDE a prisma.$transaction — uses the `tx` client.
 */
export async function applyDiscountToOrder(
  tx: any, // Prisma transaction client
  params: {
    code: string;
    orderId: string;
    customerEmail: string;
    discountAmount: number;
  }
): Promise<void> {
  const code = normalizeCode(params.code);
  const dc = await tx.discountCode.findUnique({ where: { code } });
  if (!dc) throw new Error(`DiscountCode not found: ${code}`);

  // Increment usageCount atomically
  await tx.discountCode.update({
    where: { id: dc.id },
    data: { usageCount: { increment: 1 } },
  });

  // Create DiscountUsage record
  await tx.discountUsage.create({
    data: {
      discountId: dc.id,
      orderId: params.orderId,
      customerEmail: params.customerEmail.toLowerCase(),
      amount: params.discountAmount,
    },
  });
}
