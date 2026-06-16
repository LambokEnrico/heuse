"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";
import type { ActionResponse } from "@/types";

const dropSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  published: z.boolean(),
});

export async function createDrop(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = dropSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      };
    }

    const { name, slug, description, startsAt, endsAt, published } = parsed.data;

    const existing = await prisma.drop.findUnique({ where: { slug } });
    if (existing) {
      return { success: false, error: { code: "DUPLICATE_SLUG", message: "Drop already exists" } };
    }

    const drop = await prisma.drop.create({
      data: { name, slug, description, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, published },
    });

    revalidatePath("/admin/drops");
    revalidatePath("/drops");

    return { success: true, data: { id: drop.id, slug: drop.slug } };
  } catch (error) {
    console.error("[createDrop]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to create drop" } };
  }
}

export async function updateDrop(input: unknown): Promise<ActionResponse<{ id: string; slug: string }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = dropSchema.extend({ id: z.string().cuid() }).safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      };
    }

    const { id, name, slug, description, startsAt, endsAt, published } = parsed.data;

    const drop = await prisma.drop.update({
      where: { id },
      data: { name, slug, description, startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null, published },
    });

    revalidatePath("/admin/drops");
    revalidatePath("/drops");
    revalidatePath(`/drops/${drop.slug}`);

    return { success: true, data: { id: drop.id, slug: drop.slug } };
  } catch (error) {
    console.error("[updateDrop]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update drop" } };
  }
}

export async function deleteDrop(input: unknown): Promise<ActionResponse<{ deleted: true }>> {
  const auth = await requireRole(["ADMIN", "OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const { id } = z.object({ id: z.string().cuid() }).parse(input);

    await prisma.drop.delete({ where: { id } });
    revalidatePath("/admin/drops");
    revalidatePath("/drops");

    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("[deleteDrop]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to delete drop" } };
  }
}