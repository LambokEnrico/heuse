import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);

    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.waitlistEntry.count(),
    ]);

    return NextResponse.json(paginatedResponse(entries, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/waitlist]", error);
    return NextResponse.json({ error: "Failed to fetch waitlist" }, { status: 500 });
  }
}
