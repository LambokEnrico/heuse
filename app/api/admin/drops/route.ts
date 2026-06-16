import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);

    const [drops, total] = await Promise.all([
      prisma.drop.findMany({
        orderBy: { name: "asc" },
        skip,
        take,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.drop.count(),
    ]);

    return NextResponse.json(paginatedResponse(drops, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/drops]", error);
    return NextResponse.json({ error: "Failed to fetch drops" }, { status: 500 });
  }
}
