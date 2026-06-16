import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.newsletterSubscriber.count(),
    ]);

    return NextResponse.json(paginatedResponse(subscribers, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/newsletter]", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}
