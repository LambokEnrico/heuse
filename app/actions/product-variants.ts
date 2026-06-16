"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createProductVariantSchema, updateProductVariantSchema, deleteProductVariantSchema } from "@/validations/product-variants";
import { requireRole } from "@/lib/permissions";
import type { ActionResponse } from "@/types";

const syncProductVariantsSchema = z.object({
  productId: z.string().min(1),
  variants: z.array(z.object({
    size: z.string().min(1).max(16),
    stock: z.number().int().min(0).max(9999),
  })).max(32),
});

/**
 * Atomically replaces all variants for a product with the supplied list.
 * Used by the admin product form so the form state is the single source of truth.
 * Variants with stock=0 are skipped (no zero-stock rows persisted).
 */
export async function syncProductVariants(input: unknown): Promise<ActionResponse<{ count: number }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = syncProductVariantsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid variants input",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { productId, variants } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true } });
    if (!product) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
    }

    // Dedupe by size (last one wins) — same unique constraint as DB
    const bySize = new Map<string, number>();
    for (const v of variants) {
      if (v.stock > 0) bySize.set(v.size, v.stock);
    }
    const finalVariants = Array.from(bySize.entries()).map(([size, stock]) => ({ size, stock }));

    await prisma.$transaction(async (tx) => {
      // Only wipe variants that have no order items attached — preserves history
      // for any variant that has been sold.
      const variantsWithOrders = await tx.orderItem.findMany({
        where: { variant: { productId } },
        select: { variantId: true },
        distinct: ["variantId"],
      });
      const protectedIds = variantsWithOrders
        .map((oi) => oi.variantId)
        .filter((id): id is string => Boolean(id));

      await tx.productVariant.deleteMany({
        where: { productId, id: { notIn: protectedIds } },
      });

      for (const v of finalVariants) {
        await tx.productVariant.upsert({
          where: { productId_size: { productId, size: v.size } },
          update: { stock: v.stock },
          create: { productId, size: v.size, stock: v.stock },
        });
      }
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/products");
    revalidatePath("/");

    return { success: true, data: { count: finalVariants.length } };
  } catch (error) {
    console.error("[syncProductVariants]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to sync variants" } };
  }
}

export async function createProductVariant(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = createProductVariantSchema.safeParse(input);
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

    const { productId, size, stock } = parsed.data;

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
    }

    // Check duplicate size for this product
    const existing = await prisma.productVariant.findUnique({
      where: { productId_size: { productId, size } },
    });
    if (existing) {
      return { success: false, error: { code: "DUPLICATE_SIZE", message: "This size already exists for this product" } };
    }

    const variant = await prisma.productVariant.create({
      data: { productId, size, stock },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${product.slug}`);

    return { success: true, data: { id: variant.id } };
  } catch (error) {
    console.error("[createProductVariant]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create variant" } };
  }
}

export async function updateProductVariant(input: unknown): Promise<ActionResponse<{ id: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = updateProductVariantSchema.safeParse(input);
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

    const { id, productId, size, stock } = parsed.data;

    const variant = await prisma.productVariant.update({
      where: { id },
      data: { productId, size, stock },
    });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      revalidatePath(`/admin/products/${productId}`);
      revalidatePath(`/products/${product.slug}`);
    }

    return { success: true, data: { id: variant.id } };
  } catch (error) {
    console.error("[updateProductVariant]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update variant" } };
  }
}

export async function deleteProductVariant(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = deleteProductVariantSchema.safeParse(input);
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

    const { id } = parsed.data;

    await prisma.productVariant.delete({ where: { id } });

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteProductVariant]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete variant" } };
  }
}