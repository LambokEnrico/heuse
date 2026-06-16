"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import type { ActionResponse } from "@/types";

const categorySchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export async function createCategory(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      };
    }

    const { name, slug } = parsed.data;

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return { success: false, error: { code: "DUPLICATE_SLUG", message: "Category already exists" } };
    }

    const category = await prisma.category.create({ data: { name, slug } });
    revalidatePath("/admin/categories");
    revalidatePath("/products");

    return { success: true, data: { id: category.id, slug: category.slug } };
  } catch (error) {
    console.error("[createCategory]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create category" } };
  }
}

export async function updateCategory(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = categorySchema.extend({ id: z.string().cuid() }).safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      };
    }

    const { id, name, slug } = parsed.data;

    const category = await prisma.category.update({ where: { id }, data: { name, slug } });
    revalidatePath("/admin/categories");
    revalidatePath("/products");

    return { success: true, data: { id: category.id, slug: category.slug } };
  } catch (error) {
    console.error("[updateCategory]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update category" } };
  }
}

export async function deleteCategory(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(input);

    const products = await prisma.product.count({ where: { categoryId: id } });
    if (products > 0) {
      return { success: false, error: { code: "HAS_PRODUCTS", message: "Cannot delete category with products" } };
    }

    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/categories");

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteCategory]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete category" } };
  }
}