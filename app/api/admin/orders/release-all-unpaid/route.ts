import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";

/**
 * ONE-TIME MIGRATION endpoint — release stock for ALL stuck AWAITING_PAYMENT+UNPAID orders.
 *
 * Background: Before the "stock decrement at payment" fix (commit b1e7aba),
 * stock was decremented at order creation. As a result, 9+ unpaid orders
 * have phantom stock reservations. This endpoint releases them all so stock
 * counts reflect reality.
 *
 * DELETE THIS FILE after the migration is complete (one-time use).
 *
 * Safety:
 *   - Admin/Owner only
 *   - Idempotent: re-running finds no UNPAID+CANCELLED orders to release
 *   - Atomic transaction per order
 *   - Audit logged
 */
export async function POST(req: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const stuck = await prisma.order.findMany({
      where: {
        status: "AWAITING_PAYMENT",
        paymentStatus: "UNPAID",
      },
      include: { items: true },
      orderBy: { createdAt: "asc" },
    });

    if (stuck.length === 0) {
      return NextResponse.json({
        ok: true,
        released: 0,
        message: "No stuck orders to release",
      });
    }

    const results: Array<{
      orderNumber: string;
      orderId: string;
      status: "released" | "error";
      error?: string;
    }> = [];

    for (const order of stuck) {
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
          await tx.editionUnit.updateMany({
            where: { orderItem: { orderId: order.id } },
            data: { status: "AVAILABLE", orderItemId: null },
          });
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              internalNote: (order.internalNote ? order.internalNote + "\n" : "") +
                `[Stock released by one-time migration ${new Date().toISOString()}]`,
            },
          });
        });
        results.push({ orderNumber: order.orderNumber, orderId: order.id, status: "released" });

        await auditLog({
          action: "order.release_stock",
          resource: `Order:${order.id}`,
          details: {
            orderNumber: order.orderNumber,
            itemsReleased: order.items.length,
            reason: "one_time_migration_pre_payment_decrement_fix",
          },
        });
      } catch (err) {
        results.push({
          orderNumber: order.orderNumber,
          orderId: order.id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: stuck.length,
      released: results.filter((r) => r.status === "released").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (error) {
    console.error("[admin/release-all-unpaid]", error);
    return NextResponse.json(
      { error: "Failed to release stuck orders" },
      { status: 500 }
    );
  }
}
