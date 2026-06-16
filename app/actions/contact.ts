"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { submitContactSchema } from "@/validations/contact";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import type { ActionResponse } from "@/types";

/**
 * Rate limit: 3 submissions per hour per IP.
 * Prevents bot spam flooding the contact inbox.
 */
const CONTACT_MAX = 3;
const CONTACT_WINDOW_MS = 60 * 60 * 1000;

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

export async function submitContactForm(input: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    // Rate limit BEFORE validation/DB
    const ip = await getClientIp();
    const rl = rateLimit(`contact:${ip}`, CONTACT_MAX, CONTACT_WINDOW_MS);
    if (!rl.ok) {
      const minutes = Math.ceil((rl.retryAfter || 60) / 60);
      return {
        success: false,
        error: {
          code: "RATE_LIMIT",
          message: `Too many submissions. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        },
      };
    }

    const parsed = submitContactSchema.safeParse(input);
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

    const { fullName, email, phone, subject, message } = parsed.data;

    const submission = await prisma.contactSubmission.create({
      data: { fullName, email, phone, subject, message },
    });

    revalidatePath("/admin/leads");

    return { success: true, data: { id: submission.id } };
  } catch (error) {
    console.error("[submitContactForm]", error);
    return { success: false, error: { code: "SERVER_ERROR", message: "Failed to submit contact form" } };
  }
}

