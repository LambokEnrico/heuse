import { NextRequest, NextResponse } from "next/server";
import net from "net";

/**
 * Test SMTP connectivity from Railway container.
 * Tries each port in turn with short timeout to identify what's reachable.
 *
 * Usage:
 *   GET /api/admin/test-smtp-connectivity?host=smtp.gmail.com
 *   Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function testPort(host: string, port: number, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (result: { ok: boolean; latencyMs: number; error?: string }) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ ok: true, latencyMs: Date.now() - start }));
    socket.once("timeout", () => finish({ ok: false, latencyMs: Date.now() - start, error: "TIMEOUT" }));
    socket.once("error", (err) => finish({ ok: false, latencyMs: Date.now() - start, error: err.message }));
    socket.connect(port, host);
  });
}

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
  const host = url.searchParams.get("host") || "smtp.gmail.com";

  const ports = [25, 465, 587, 2525];
  const results: Record<string, any> = {};

  for (const port of ports) {
    results[port] = await testPort(host, port, 5000);
  }

  return NextResponse.json({
    host,
    testedAt: new Date().toISOString(),
    results,
    summary: Object.entries(results)
      .map(([port, r]) => `port ${port}: ${(r as any).ok ? `✅ ${(r as any).latencyMs}ms` : `❌ ${(r as any).error}`}`)
      .join(" | "),
  });
}
