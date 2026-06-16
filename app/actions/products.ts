"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createProductSchema, updateProductSchema, deleteProductSchema } from "@/validations/products";
import { requireRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import type { ActionResponse } from "@/types";

export async function createProduct(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = createProductSchema.safeParse(input);
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

    const { name, slug, sku, shortDescription, description, price, categoryId, dropId, editionLimit, featured, published, images } = parsed.data;

    // Check duplicate slug
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      return {
        success: false,
        error: { code: "DUPLICATE_SLUG", message: "A product with this slug already exists" },
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        shortDescription,
        description,
        price,
        categoryId,
        dropId,
        editionLimit,
        featured,
        status: published ? "PUBLISHED" : "DRAFT",
        images: images ? {
          create: images.map((img, index) => ({
            url: img.url,
            alt: img.alt || null,
            sortOrder: index,
          })),
        } : undefined,
      },
    });

    await auditLog({
      action: "product.create",
      resource: `Product:${product.id}`,
      details: { name, slug, price, editionLimit, published },
    });

    revalidatePath("/products");
    revalidatePath("/");
    revalidatePath("/admin/products");

    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    console.error("[createProduct]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create product" } };
  }
}

export async function updateProduct(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = updateProductSchema.safeParse(input);
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

    const { id, name, slug, sku, shortDescription, description, price, categoryId, dropId, editionLimit, featured, published, images } = parsed.data;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: { code: "NOT_FOUND", message: "Product not found" } };
    }

    // Check slug uniqueness if changed
    if (slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({ where: { slug } });
      if (slugConflict) {
        return { success: false, error: { code: "DUPLICATE_SLUG", message: "A product with this slug already exists" } };
      }
    }

    // Delete existing images and recreate
    await prisma.productImage.deleteMany({ where: { productId: id } });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        sku,
        shortDescription,
        description,
        price,
        categoryId,
        dropId,
        editionLimit,
        featured,
        status: published ? "PUBLISHED" : "DRAFT",
        images: images ? {
          create: images.map((img, index) => ({
            url: img.url,
            alt: img.alt || null,
            sortOrder: index,
          })),
        } : undefined,
      },
    });

    await auditLog({
      action: "product.update",
      resource: `Product:${product.id}`,
      details: {
        changes: { name, slug, price, editionLimit, featured, published },
        previousPrice: existing.price,
        previousStatus: existing.status,
      },
    });

    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/products");
    revalidatePath("/");
    revalidatePath("/admin/products");

    return { success: true, data: { id: product.id, slug: product.slug } };
  } catch (error) {
    console.error("[updateProduct]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update product" } };
  }
}

export async function deleteProduct(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = deleteProductSchema.safeParse(input);
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

    // Check for order items
    const orderItems = await prisma.orderItem.count({ where: { productId: id } });
    if (orderItems > 0) {
      return {
        success: false,
        error: { code: "PRODUCT_HAS_ORDERS", message: "Cannot delete product with existing order items" },
      };
    }

    await prisma.product.delete({ where: { id } });

    await auditLog({
      action: "product.delete",
      resource: `Product:${id}`,
      details: { productId: id },
    });

    revalidatePath("/products");
    revalidatePath("/");
    revalidatePath("/admin/products");

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteProduct]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete product" } };
  }
}