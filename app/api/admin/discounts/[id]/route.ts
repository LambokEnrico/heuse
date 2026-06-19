import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleApi } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { discountCodeSchema } from "@/validations/discount";
import { normalizeCode } from "@/lib/discount";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { id } = await params;
    const code = await prisma.discountCode.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            orderId: true,
            customerEmail: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });
    if (!code) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(code);
  } catch (error) {
    console.error("[api/admin/discounts/[id] GET]", error);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = discountCodeSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existing = await prisma.discountCode.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If changing code, check uniqueness
    let codeUpdate: string | undefined;
    if (data.code && normalizeCode(data.code) !== existing.code) {
      codeUpdate = normalizeCode(data.code);
      const conflict = await prisma.discountCode.findUnique({
        where: { code: codeUpdate },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `Code "${codeUpdate}" already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(codeUpdate && { code: codeUpdate }),
        ...(data.type && { type: data.type }),
        ...(data.value !== undefined && { value: data.value }),
        ...(data.minPurchase !== undefined && { minPurchase: data.minPurchase }),
        ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
        ...(data.usageLimit !== undefined && { usageLimit: data.usageLimit }),
        ...(data.perCustomerLimit !== undefined && {
          perCustomerLimit: data.perCustomerLimit,
        }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });

    await auditLog({
      action: "discount.update",
      resource: `DiscountCode:${id}`,
      details: { changes: Object.keys(data) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[api/admin/discounts/[id] PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update discount code" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoleApi(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { id } = await params;
    const existing = await prisma.discountCode.findUnique({
      where: { id },
      include: { _count: { select: { usages: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Don't hard-delete if there are usages (preserves audit trail)
    // Instead, deactivate
    if (existing._count.usages > 0) {
      const updated = await prisma.discountCode.update({
        where: { id },
        data: { active: false },
      });
      await auditLog({
        action: "discount.deactivate",
        resource: `DiscountCode:${id}`,
        details: { reason: "has_usages", count: existing._count.usages },
      });
      return NextResponse.json({
        deactivated: true,
        id: updated.id,
        message: `Code has ${existing._count.usages} usages — deactivated instead of deleted`,
      });
    }

    await prisma.discountCode.delete({ where: { id } });
    await auditLog({
      action: "discount.delete",
      resource: `DiscountCode:${id}`,
      details: { code: existing.code },
    });
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("[api/admin/discounts/[id] DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete discount code" },
      { status: 500 }
    );
  }
}
