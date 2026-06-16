"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { addProductImageSchema, deleteProductImageSchema } from "@/validations/product-variants";
import { requireRole } from "@/lib/permissions";
import type { ActionResponse } from "@/types";

export async function addProductImage(input: unknown): Promise<ActionResponse<{ id: string; url: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = addProductImageSchema.safeParse(input);
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

    const { productId, url, alt, sortOrder } = parsed.data;

    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
    }

    // Check max images (12)
    const currentCount = await prisma.productImage.count({ where: { productId } });
    if (currentCount >= 12) {
      return { success: false, error: { code: "MAX_IMAGES", message: "Maximum 12 images per product" } };
    }

    const image = await prisma.productImage.create({
      data: { productId, url, alt, sortOrder },
    });

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${product.slug}`);

    return { success: true, data: { id: image.id, url: image.url } };
  } catch (error) {
    console.error("[addProductImage]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to add image" } };
  }
}

export async function deleteProductImage(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = deleteProductImageSchema.safeParse(input);
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

    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      return { success: false, error: { code: "NOT_FOUND", message: "Image not found" } };
    }

    const product = await prisma.product.findUnique({ where: { id: image.productId } });

    await prisma.productImage.delete({ where: { id } });

    if (product) {
      revalidatePath(`/admin/products/${image.productId}`);
      revalidatePath(`/products/${product.slug}`);
    }

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteProductImage]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete image" } };
  }
}