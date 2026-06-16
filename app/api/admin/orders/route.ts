import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { parsePagination, paginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const { page, pageSize, skip, take } = parsePagination(request);

    const where = status
      ? { status: status as "PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "AWAITING_PAYMENT" }
      : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(orders, total, page, pageSize));
  } catch (error) {
    console.error("[GET /api/admin/orders]", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
