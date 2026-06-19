import { z } from "zod";

/**
 * Public-facing discount validation request (cart preview).
 * The customer types a code; we compute the discount live.
 */
export const validateDiscountSchema = z.object({
  code: z.string().min(1).max(64),
  subtotal: z.coerce.number().positive().max(100_000_000),
  customerEmail: z.string().email().optional(),
});

/**
 * Admin discount code schema (create/edit).
 */
export const discountCodeSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, digits, _ or -"),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().positive().max(100_000_000),
  minPurchase: z.coerce.number().positive().max(100_000_000).optional(),
  maxDiscount: z.coerce.number().positive().max(100_000_000).optional(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : null)),
  usageLimit: z.coerce.number().int().positive().optional(),
  perCustomerLimit: z.coerce.number().int().positive().optional(),
  active: z.coerce.boolean().default(true),
  description: z.string().max(280).optional(),
});

export type DiscountCodeInput = z.infer<typeof discountCodeSchema>;
