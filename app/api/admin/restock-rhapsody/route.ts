import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * One-off restock endpoint for RHAPSODY Jacquard Jacket (sizes S + L).
 *
 * Auth: CRON_SECRET bearer token (same as cron endpoints).
 *
 * Trigger manually via:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://heuse-production-9203.up.railway.app/api/admin/restock-rhapsody
 *
 * Idempotent: running multiple times keeps stock at TARGET.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRODUCT_SLUG = "rhapsody-jacquard-jacket";
const TARGET_SIZES = ["S", "L"];
const TARGET_STOCK = 10;

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

  try {
    const product = await prisma.product.findUnique({
      where: { slug: PRODUCT_SLUG },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: `Product '${PRODUCT_SLUG}' not found` }, { status: 404 });
    }

    const changes: Array<{ size: string; before: number; after: number }> = [];

    for (const size of TARGET_SIZES) {
      const variant = product.variants.find((v) => v.size === size);
      if (!variant) continue;

      if (variant.stock === TARGET_STOCK) {
        changes.push({ size, before: TARGET_STOCK, after: TARGET_STOCK });
        continue;
      }

      const updated = await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: TARGET_STOCK },
      });
      changes.push({ size, before: variant.stock, after: updated.stock });
    }

    return NextResponse.json({
      ok: true,
      product: product.name,
      target: TARGET_STOCK,
      changes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[admin/restock-rhapsody]", error);
    return NextResponse.json(
      { error: "Failed to restock", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}