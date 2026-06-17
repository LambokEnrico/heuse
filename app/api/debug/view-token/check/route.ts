import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOrderViewToken, hashOrderViewToken } from "@/lib/order-token";

/**
 * TEMPORARY DEBUG ENDPOINT — DO NOT DEPLOY TO PRODUCTION
 *
 * Diagnose why /checkout/success/[orderNumber] returns 404.
 * Returns the stored viewToken hash + verification result for a given
 * orderNumber + candidate viewToken.
 *
 * DELETE THIS FILE after debugging.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderNumber = searchParams.get("orderNumber");
  const candidateToken = searchParams.get("token");

  if (!orderNumber) {
    return NextResponse.json({ error: "orderNumber required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      viewToken: true,
      viewTokenExpiresAt: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found in DB" }, { status: 404 });
  }

  let verifyResult = null;
  let candidateHash = null;
  if (candidateToken) {
    candidateHash = hashOrderViewToken(candidateToken);
    verifyResult = verifyOrderViewToken(candidateToken, order.viewToken);
  }

  const now = new Date();
  const expired = order.viewTokenExpiresAt
    ? order.viewTokenExpiresAt.getTime() < now.getTime()
    : true;

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      status: order.status,
      viewTokenExpiresAt: order.viewTokenExpiresAt,
      expired,
      viewTokenHashPrefix: order.viewToken?.slice(0, 16) + "...",
    },
    candidate: candidateToken
      ? {
          tokenLength: candidateToken.length,
          hashPrefix: candidateHash?.slice(0, 16) + "...",
          match: verifyResult,
        }
      : null,
    secret: {
      hasOrderTokenSecret: !!process.env.ORDER_TOKEN_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    },
  });
}
