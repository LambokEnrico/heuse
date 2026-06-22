import { NextRequest, NextResponse } from "next/server";
import { sendOrderConfirmation } from "@/lib/email";

/**
 * Test endpoint — send a fake order confirmation email to verify SMTP works.
 *
 * Usage:
 *   POST /api/admin/test-email?to=email@example.com
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Idempotent & safe — only sends one test email per call.
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
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  // Default recipient = Resend account email (only verified recipient for un-verified domains).
  // Override with ?to=other@email.com (will fail unless domain is verified at resend.com/domains).
  const to = url.searchParams.get("to") || "lambokenricoprayoga@gmail.com";

  try {
    const result = await sendOrderConfirmation({
      email: to,
      customerName: "Rico (Test)",
      orderNumber: "TEST-EMAIL-001",
      total: 890000,
      items: [
        { name: "RHAPSODY Jacquard Jacket", size: "L", quantity: 1, price: 890000 },
      ],
      siteUrl: "https://heuse-production-9203.up.railway.app",
      trackingToken: "test-token-12345",
    });

    if (!result) {
      return NextResponse.json(
        { ok: false, error: "Email send failed (check Railway logs)" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      messageId: result.id,
      to,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}