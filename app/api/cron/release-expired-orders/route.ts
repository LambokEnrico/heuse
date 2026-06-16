import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Release stock for orders that expired without payment.
 *
 * Runs via cron (Railway Cron / GitHub Actions / external scheduler).
 * Configured to call:
 *   POST/GET https://<your-domain>/api/cron/release-expired-orders
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Schedule: every 15 minutes.
 *
 * What it does:
 *   1. Find all orders where:
 *      - status = "AWAITING_PAYMENT"
 *      - paymentStatus = "UNPAID"
 *      - expiredAt < now
 *   2. For each, restore stock to the variant
 *   3. Mark order as CANCELLED with reason
 *
 * Idempotent: re-running on already-cancelled orders is a no-op.
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
  // Auth: cron secret
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find expired, unpaid orders
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
        expiredAt: { lt: now },
      },
      include: { items: true },
    });

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        ok: true,
        released: 0,
        timestamp: now.toISOString(),
      });
    }

    let releasedCount = 0;
    const errors: Array<{ orderId: string; error: string }> = [];

    for (const order of expiredOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          // Release stock for each item
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }

          // Mark order as cancelled
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              internalNote: "Auto-cancelled by cron (reservation expired)",
            },
          });
        });
        releasedCount++;
      } catch (err) {
        errors.push({
          orderId: order.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      found: expiredOrders.length,
      released: releasedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[cron/release-expired-orders]", error);
    return NextResponse.json(
      { error: "Failed to release expired orders" },
      { status: 500 }
    );
  }
}
