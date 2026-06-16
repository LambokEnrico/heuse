"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createEditionUnitsSchema } from "@/validations/product-variants";
import { requireRole } from "@/lib/permissions";
import type { ActionResponse } from "@/types";

export async function createEditionUnits(input: unknown): Promise<ActionResponse<{ createdCount: number }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = createEditionUnitsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { productId, variantId, startSerial, endSerial } = parsed.data;

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
    }

    const count = endSerial - startSerial + 1;

    // Check if we're exceeding edition limit
    const existingUnits = await prisma.editionUnit.count({ where: { productId } });
    if (existingUnits + count > product.editionLimit) {
      return {
        success: false,
        error: {
          code: "EXCEEDS_LIMIT",
          message: `Cannot create ${count} units. Would exceed edition limit of ${product.editionLimit}. ${product.editionLimit - existingUnits} remaining.`,
        },
      };
    }

    // Check for serial number conflicts
    for (let serial = startSerial; serial <= endSerial; serial++) {
      const existing = await prisma.editionUnit.findUnique({
        where: { productId_serialNumber: { productId, serialNumber: serial } },
      });
      if (existing) {
        return {
          success: false,
          error: { code: "SERIAL_EXISTS", message: `Serial number ${serial} already exists for this product` },
        };
      }
    }

    // Create units in a transaction
    await prisma.$transaction(async (tx) => {
      for (let serial = startSerial; serial <= endSerial; serial++) {
        await tx.editionUnit.create({
          data: {
            productId,
            variantId,
            serialNumber: serial,
            status: "AVAILABLE",
          },
        });
      }
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${product.slug}`);

    return { success: true, data: { createdCount: count } };
  } catch (error) {
    console.error("[createEditionUnits]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create edition units" } };
  }
}

export async function reserveEditionUnit(input: { unitId: string; orderItemId: string }): Promise<ActionResponse<{ reserved: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const unit = await prisma.editionUnit.findUnique({ where: { id: input.unitId } });
    if (!unit) {
      return { success: false, error: { code: "NOT_FOUND", message: "Unit not found" } };
    }

    if (unit.status !== "AVAILABLE") {
      return { success: false, error: { code: "UNIT_NOT_AVAILABLE", message: "Unit is not available for reservation" } };
    }

    await prisma.editionUnit.update({
      where: { id: input.unitId },
      data: { status: "RESERVED", orderItemId: input.orderItemId },
    });

    return { success: true, data: { reserved: true } };
  } catch (error) {
    console.error("[reserveEditionUnit]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to reserve unit" } };
  }
}

export async function releaseEditionUnit(input: { unitId: string }): Promise<ActionResponse<{ released: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    await prisma.editionUnit.update({
      where: { id: input.unitId },
      data: { status: "AVAILABLE", orderItemId: null },
    });

    return { success: true, data: { released: true } };
  } catch (error) {
    console.error("[releaseEditionUnit]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to release unit" } };
  }
}