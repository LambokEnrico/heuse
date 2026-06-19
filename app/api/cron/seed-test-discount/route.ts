import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ONE-OFF TESTING: Create a test discount code directly.
 * Idempotent — re-running updates the existing code.
 *
 * POST /api/cron/seed-test-discount
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Creates LAUNCH20 — 20% off, no min purchase, 100 total uses.
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

  const code = await prisma.discountCode.upsert({
    where: { code: "LAUNCH20" },
    update: {
      active: true,
      value: 20,
      type: "PERCENTAGE",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
    },
    create: {
      code: "LAUNCH20",
      type: "PERCENTAGE",
      value: 20,
      description: "Test launch promo (20% off)",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: 100,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, code });
}
