import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { discountCodeSchema } from "@/validations/discount";
import { parsePagination, paginatedResponse } from "@/lib/pagination";
import { normalizeCode } from "@/lib/discount";

export async function GET(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { page, pageSize, skip, take } = parsePagination(request);
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim();
    const activeFilter = searchParams.get("active");

    const where: any = {};
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (activeFilter === "true") where.active = true;
    if (activeFilter === "false") where.active = false;

    const [codes, total] = await Promise.all([
      prisma.discountCode.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.discountCode.count({ where }),
    ]);

    return NextResponse.json(
      paginatedResponse(codes, total, page, pageSize)
    );
  } catch (error) {
    console.error("[api/admin/discounts GET]", error);
    return NextResponse.json(
      { error: "Failed to load discount codes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const body = await request.json();
    const parsed = discountCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const code = normalizeCode(data.code);

    // Validate PERCENTAGE value range
    if (data.type === "PERCENTAGE" && data.value > 100) {
      return NextResponse.json(
        { error: "Percentage cannot exceed 100%" },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await prisma.discountCode.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { error: `Code "${code}" already exists` },
        { status: 409 }
      );
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase ?? null,
        maxDiscount: data.maxDiscount ?? null,
        expiresAt: data.expiresAt ?? null,
        usageLimit: data.usageLimit ?? null,
        perCustomerLimit: data.perCustomerLimit ?? null,
        active: data.active,
        description: data.description ?? null,
      },
    });

    await auditLog({
      action: "discount.create",
      resource: `DiscountCode:${created.id}`,
      details: { code: created.code, type: created.type, value: created.value },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[api/admin/discounts POST]", error);
    return NextResponse.json(
      { error: "Failed to create discount code" },
      { status: 500 }
    );
  }
}
