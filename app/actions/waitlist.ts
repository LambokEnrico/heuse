"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { joinWaitlistSchema } from "@/validations/contact";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { ActionResponse } from "@/types";

/**
 * Rate limit: 3 waitlist joins per hour per IP.
 * Prevents drop-launch bot spam.
 */
const WAITLIST_MAX = 3;
const WAITLIST_WINDOW_MS = 60 * 60 * 1000;

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

export async function joinWaitlist(input: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    // Rate limit BEFORE validation
    const ip = await getClientIp();
    const rl = rateLimit(`waitlist:${ip}`, WAITLIST_MAX, WAITLIST_WINDOW_MS);
    if (!rl.ok) {
      const minutes = Math.ceil((rl.retryAfter || 60) / 60);
      return {
        success: false,
        error: {
          code: "RATE_LIMIT",
          message: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        },
      };
    }

    const parsed = joinWaitlistSchema.safeParse(input);
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

    const { productId, dropId, fullName, email, phone, sizeInterest } = parsed.data;

    const entry = await prisma.waitlistEntry.create({
      data: { productId, dropId, fullName, email, phone, sizeInterest },
    });

    revalidatePath("/admin/leads");

    return { success: true, data: { id: entry.id } };
  } catch (error) {
    console.error("[joinWaitlist]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to join waitlist" } };
  }
}


