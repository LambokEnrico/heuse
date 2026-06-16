import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint for Railway.
 * Returns 200 if app is alive.
 * Verifies database connectivity.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Verify DB connection
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected",
        service: "heuse",
      },
      { status: 200 }
    );
  } catch (error) {
    // Log full error server-side; return generic error to client.
    // Don't leak DB connection string or driver internals via error.message.
    console.error("[health] DB check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    );
  }
}
