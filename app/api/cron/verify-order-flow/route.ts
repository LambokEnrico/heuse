import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * VERIFICATION endpoint — check order flow cleanliness.
 *
 * Reports:
 *   1. Stuck UNPAID orders count
 *   2. Stock summary per variant
 *   3. Recent orders (last 10) + their status
 *   4. Cron release-expired-orders health
 *   5. Total inventory value
 *
 * Auth: CRON_SECRET (same as other cron endpoints)
 *
 * REMOVE AFTER VERIFICATION.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Stuck UNPAID orders
    const stuckOrders = await prisma.order.findMany({
      where: {
        paymentStatus: "UNPAID",
        status: { in: ["AWAITING_PAYMENT", "CANCELLED"] },
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Stock summary
    const variants = await prisma.productVariant.findMany({
      include: { product: true },
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }],
    });

    // 3. Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { variant: { include: { product: true } } } },
      },
    });

    // 4. Expired but not yet released (cron candidate)
    const expiredNotReleased = await prisma.order.findMany({
      where: {
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
        expiredAt: { lt: new Date() },
      },
      select: { orderNumber: true, expiredAt: true, total: true },
    });

    // 5. Stats
    const totalOrders = await prisma.order.count();
    const paidOrders = await p_count(prisma, "PAID");
    const cancelledOrders = await p_count(prisma, "CANCELLED");

    const stockSummary = variants.map((v) => ({
      product: v.product.name,
      slug: v.product.slug,
      size: v.size,
      stock: v.stock,
      price: Number(v.product.price),
      value: v.stock * Number(v.product.price),
    }));

    const totalInventoryValue = stockSummary.reduce((s, x) => s + x.value, 0);
    const totalUnitsInStock = stockSummary.reduce((s, x) => s + x.stock, 0);

    // Verdict
    const issues: string[] = [];
    if (stuckOrders.length > 0) {
      issues.push(
        `${stuckOrders.length} stuck UNPAID order(s) with active status (need release)`
      );
    }
    if (expiredNotReleased.length > 0) {
      issues.push(
        `${expiredNotReleased.length} expired order(s) not yet released (cron may be down)`
      );
    }
    const lowStock = stockSummary.filter((v) => v.stock <= 1);
    if (lowStock.length > 0) {
      issues.push(
        `${lowStock.length} variant(s) with low stock (≤1): ${lowStock
          .map((v) => `${v.product}/${v.size}=${v.stock}`)
          .join(", ")}`
      );
    }

    return NextResponse.json({
      ok: true,
      verdict: issues.length === 0 ? "CLEAN" : "NEEDS_ATTENTION",
      timestamp: new Date().toISOString(),
      issues,
      stats: {
        totalOrders,
        paidOrders,
        cancelledOrders,
        unpaidActive: stuckOrders.length,
        expiredNotReleased: expiredNotReleased.length,
      },
      stock: {
        totalUnits: totalUnitsInStock,
        totalValue: totalInventoryValue,
        variants: stockSummary,
      },
      stuckOrders: stuckOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.customerName,
        total: Number(o.total),
        status: o.status,
        paymentStatus: o.paymentStatus,
        expiredAt: o.expiredAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map((i) => ({
          product: i.variant?.product?.name || i.name,
          size: i.variant?.size || i.size,
          qty: i.quantity,
        })),
      })),
      expiredNotReleased: expiredNotReleased.map((o) => ({
        orderNumber: o.orderNumber,
        expiredAt: o.expiredAt?.toISOString() ?? null,
        total: Number(o.total),
      })),
      recentOrders: recentOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.customerName,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: Number(o.total),
        items: o.items.length,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[verify-order-flow]", error);
    return NextResponse.json(
      {
        error: "Failed to verify order flow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function p_count(prisma: any, status: string) {
  return await prisma.order.count({ where: { status } });
}
