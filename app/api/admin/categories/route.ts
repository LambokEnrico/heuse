import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        skip,
        take,
        include: {
          _count: { select: { products: true } },
        },
      }),
      prisma.category.count(),
    ]);

    return NextResponse.json(paginatedResponse(categories, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/categories]", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
