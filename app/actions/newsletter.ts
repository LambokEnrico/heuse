"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { subscribeNewsletterSchema } from "@/validations/contact";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { ActionResponse } from "@/types";

/**
 * Rate limit: 5 subscriptions per hour per IP.
 * Higher than contact (lower friction) but still bounded.
 */
const NEWSLETTER_MAX = 5;
const NEWSLETTER_WINDOW_MS = 60 * 60 * 1000;

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

export async function subscribeNewsletter(input: unknown): Promise<ActionResponse<{ subscribed: true }>> {
  try {
    // Rate limit BEFORE validation (cheaper)
    const ip = await getClientIp();
    const rl = rateLimit(`newsletter:${ip}`, NEWSLETTER_MAX, NEWSLETTER_WINDOW_MS);
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

    const parsed = subscribeNewsletterSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid email",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const { email, source } = parsed.data;

    // Upsert - update if exists, create if not (duplicate email returns success)
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: { active: true, source },
      create: { email, source, active: true },
    });

    revalidatePath("/admin/newsletter");

    return { success: true, data: { subscribed: true } };
  } catch (error) {
    console.error("[subscribeNewsletter]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to subscribe" } };
  }
}

