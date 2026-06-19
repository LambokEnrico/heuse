import { NextRequest, NextResponse } from "next/server";
import { validateDiscountSchema } from "@/validations/discount";
import { validateDiscountForCart } from "@/lib/discount";

/**
 * Public endpoint: validate a discount code for the current cart.
 *
 * POST /api/discount/validate
 * Body: { code, subtotal, customerEmail? }
 *
 * Returns: { ok: true, code, type, value, discountAmount, displayValue, description }
 *       or { ok: false, error, code? }
 *
 * Does NOT consume the code. Idempotent — safe to call on every keystroke
 * (with debouncing on the client).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await validateDiscountForCart({
      code: parsed.data.code,
      subtotal: parsed.data.subtotal,
      customerEmail: parsed.data.customerEmail ?? "",
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[api/discount/validate]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to validate discount code" },
      { status: 500 }
    );
  }
}
