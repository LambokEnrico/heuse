import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Append a row to the audit log.
 * Fire-and-forget — errors are logged but don't fail the calling action
 * (we don't want audit logging to break the user's actual operation).
 *
 * Usage:
 *   await auditLog({
 *     action: "product.create",
 *     resource: `Product:${product.id}`,
 *     details: { name: product.name, price: product.price }
 *   });
 */
export interface AuditLogInput {
  action: string;
  resource?: string;
  details?: Record<string, unknown>;
  userId?: string;
  userEmail?: string;
}

export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    // Auto-fetch user from session if not provided
    let userId = input.userId;
    let userEmail = input.userEmail;
    if (!userId || !userEmail) {
      try {
        const session = await auth();
        if (session?.user) {
          userId = userId ?? session.user.id;
          userEmail = userEmail ?? session.user.email ?? undefined;
        }
      } catch {
        // Not in a request context (e.g., seed) — skip
      }
    }

    // Get IP and user agent (best effort, may fail outside request scope)
    let ip: string | undefined;
    let userAgent: string | undefined;
    try {
      const h = await headers();
      ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        undefined;
      userAgent = h.get("user-agent") || undefined;
    } catch {
      // Outside request scope
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action: input.action,
        resource: input.resource,
        details: input.details ? JSON.stringify(input.details) : null,
        ip,
        userAgent,
      },
    });
  } catch (error) {
    // Never let audit logging break the main flow
    console.error("[auditLog] Failed to write audit log:", error);
  }
}

/**
 * Query audit logs with filters. For admin "Audit Log" page.
 */
export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export async function getAuditLogs(filter: AuditLogFilter = {}) {
  return prisma.auditLog.findMany({
    where: {
      userId: filter.userId,
      action: filter.action,
      resource: filter.resource,
      createdAt: {
        gte: filter.startDate,
        lte: filter.endDate,
      },
    },
    orderBy: { createdAt: "desc" },
    take: filter.limit ?? 100,
  });
}
