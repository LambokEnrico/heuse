import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * ONE-OFF TESTING: Create multiple test discount codes.
 * Idempotent — re-running updates existing codes.
 *
 * POST /api/cron/seed-test-discount
 * Header: Authorization: Bearer <CRON_SECRET>
 *
 * Codes created:
 *   - LAUNCH20    : 20% off, no cap, 100 uses, expires in 30d
 *   - FIXED50K    : Rp 50.000 off, min purchase 200k
 *   - CAP100K     : 50% off, capped at 100k (to test maxDiscount)
 *   - EXPIRED     : 10% off, already expired
 *   - ONESHOT     : 15% off, only 1 use total, only 1 per customer
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

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const seeds = [
    {
      code: "LAUNCH20",
      type: "PERCENTAGE",
      value: 20,
      description: "Test launch promo (20% off)",
      expiresAt: new Date(now + 30 * day),
      usageLimit: 100,
    },
    {
      code: "FIXED50K",
      type: "FIXED",
      value: 50000,
      minPurchase: 200000,
      description: "Rp 50.000 off orders ≥ Rp 200.000",
      usageLimit: 50,
    },
    {
      code: "CAP100K",
      type: "PERCENTAGE",
      value: 50,
      maxDiscount: 100000,
      description: "50% off capped at Rp 100.000",
      usageLimit: 30,
    },
    {
      code: "EXPIRED",
      type: "PERCENTAGE",
      value: 10,
      description: "Already expired test code",
      expiresAt: new Date(now - 1 * day),
      usageLimit: 10,
    },
    {
      code: "ONESHOT",
      type: "PERCENTAGE",
      value: 15,
      description: "One-shot test (1 total use, 1 per customer)",
      usageLimit: 1,
      perCustomerLimit: 1,
    },
  ];

  const results = [];
  for (const s of seeds) {
    const code = await prisma.discountCode.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    results.push({ code: code.code, type: code.type });
  }

  return NextResponse.json({ ok: true, seeded: results });
}
