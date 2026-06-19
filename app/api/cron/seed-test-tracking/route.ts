import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueOrderTrackingToken, hashOrderViewToken } from "@/lib/order-token";

/**
 * ONE-OFF TESTING: Attach a tracking token to a test order so we can
 * verify the /track page renders.
 *
 * POST /api/cron/seed-test-tracking
 *   Body: { orderNumber: string, trackingNumber?: string, trackingCarrier?: string }
 *
 * Idempotent — re-running just rotates the token.
 *
 * REMOVE AFTER TESTING.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // empty body ok
  }

  const orderNumber = body.orderNumber || "HEUSE-MQI5QGQC-FF3B";
  const trackingNumber = body.trackingNumber || "JNE1234567890";
  const trackingCarrier = body.trackingCarrier || "JNE";

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) {
    return NextResponse.json({ error: `Order ${orderNumber} not found` }, { status: 404 });
  }

  const { token: rawToken, hash, expiresAt } = issueOrderTrackingToken();

  await prisma.order.update({
    where: { id: order.id },
    data: {
      trackingToken: hash,
      trackingTokenExpiresAt: expiresAt,
      trackingNumber,
      trackingCarrier,
      shippedAt: order.shippedAt ?? new Date(),
      fulfillmentStatus: order.fulfillmentStatus === "UNFULFILLED" ? "SHIPPED" : order.fulfillmentStatus,
    },
  });

  return NextResponse.json({
    ok: true,
    orderNumber,
    rawToken,
    trackingNumber,
    trackingCarrier,
    url: `https://heuse-production-9203.up.railway.app/track/${orderNumber}?token=${rawToken}`,
  });
}
