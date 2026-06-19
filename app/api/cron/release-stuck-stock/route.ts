import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ONE-OFF MIGRATION: Release stuck stock for UNPAID orders
 *
 * These are legacy orders where:
 * - Stock was decremented by old code
 * - But order didn't get marked CANCELLED properly
 * - OR the auto-release cron hasn't fired yet
 *
 * This endpoint releases stock for ANY UNPAID+AWAITING_PAYMENT order,
 * regardless of expiredAt. Idempotent: re-running is safe (won't
 * double-increment because we check current order status).
 *
 * Usage:
 *   GET/POST /api/cron/release-stuck-stock
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Query params:
 *   ?dryRun=true   — show what would happen without changes
 *   ?orderNumber=X — only process specific order
 *
 * REMOVE THIS FILE AFTER MIGRATION.
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

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const orderNumber = url.searchParams.get("orderNumber");

  try {
    // Find stuck UNPAID orders
    const where: any = {
      paymentStatus: "UNPAID",
      status: "AWAITING_PAYMENT",
    };
    if (orderNumber) where.orderNumber = orderNumber;

    const stuckOrders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (stuckOrders.length === 0) {
      return NextResponse.json({
        ok: true,
        found: 0,
        released: 0,
        message: "No stuck UNPAID orders found",
        dryRun,
        timestamp: new Date().toISOString(),
      });
    }

    // Build report
    const report = stuckOrders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: o.customerName,
      total: Number(o.total),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((i) => ({
        product: i.variant?.product?.name || i.name,
        size: i.variant?.size || i.size,
        qty: i.quantity,
      })),
    }));

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        found: stuckOrders.length,
        released: 0,
        dryRun: true,
        orders: report,
        timestamp: new Date().toISOString(),
      });
    }

    // Release stock
    let releasedCount = 0;
    const errors: Array<{ orderNumber: string; error: string }> = [];

    for (const order of stuckOrders) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const item of order.items) {
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              internalNote: "Released by stuck-stock migration (manual one-off)",
            },
          });
        });
        releasedCount++;
      } catch (err) {
        errors.push({
          orderNumber: order.orderNumber,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      found: stuckOrders.length,
      released: releasedCount,
      errors: errors.length > 0 ? errors : undefined,
      orders: report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/release-stuck-stock]", error);
    return NextResponse.json(
      {
        error: "Failed to release stuck stock",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
