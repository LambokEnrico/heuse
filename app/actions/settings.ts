"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { auditLog } from "@/lib/audit";
import { z } from "zod";
import type { ActionResponse } from "@/types";

const settingsSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.string().max(500),
});

export async function updateSettings(input: unknown): Promise<ActionResponse<{ key: string }>> {
  const auth = await requireRole(["OWNER"]);
  if (!auth.authorized) return auth.error;

  try {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors },
      };
    }

    const { key, value } = parsed.data;

    // Fetch previous value for audit
    const previous = await prisma.setting.findUnique({ where: { key } });

    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    await auditLog({
      action: "settings.update",
      resource: `Setting:${key}`,
      details: {
        key,
        previousValue: previous?.value ?? null,
        newValue: value,
      },
    });

    revalidatePath("/admin/settings");

    return { success: true, data: { key } };
  } catch (error) {
    console.error("[updateSettings]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to update settings" } };
  }
}

export async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? null;
}