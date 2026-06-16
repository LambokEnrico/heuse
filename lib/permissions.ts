import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { ActionResponse } from "@/types";

/**
 * Auth + role check helpers.
 *
 * Two variants:
 *   - `requireRole(allowedRoles)` — for Server Actions.
 *     Returns ActionResponse<never> on failure (so callers can `return auth.error`).
 *
 *   - `requireRoleApi(allowedRoles)` — for Next.js Route Handlers (app/api/.../route.ts).
 *     Returns NextResponse on failure (so callers can `return auth.error` and
 *     the type system is happy with `Response | void` return types).
 *
 * Both work the same way conceptually; the difference is the failure shape
 * each consumer needs.
 */

// =============================================================================
// Server Action variant
// =============================================================================

export type RequireRoleSuccessAction = {
  authorized: true;
  user: { id: string; email: string; role: string };
};
export type RequireRoleFailureAction = {
  authorized: false;
  error: ActionResponse<never>;
};
export type RequireRoleResultAction =
  | RequireRoleSuccessAction
  | RequireRoleFailureAction;

export async function requireRole(
  allowedRoles: string[]
): Promise<RequireRoleResultAction> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      error: {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
    };
  }

  const userRole = session.user.role;

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: {
        success: false,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
      },
    };
  }

  return { authorized: true, user: session.user };
}

// =============================================================================
// API Route Handler variant
// =============================================================================

export type RequireRoleSuccessApi = {
  authorized: true;
  user: { id: string; email: string; role: string };
};
export type RequireRoleFailureApi = {
  authorized: false;
  error: NextResponse;
};
export type RequireRoleResultApi =
  | RequireRoleSuccessApi
  | RequireRoleFailureApi;

export async function requireRoleApi(
  allowedRoles: string[]
): Promise<RequireRoleResultApi> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = session.user.role;

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { authorized: true, user: session.user };
}

// =============================================================================
// Pure helpers (used in JSX / display logic)
// =============================================================================

export function isAdmin(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function isOwner(role: string): boolean {
  return role === "OWNER";
}

export function canManageProducts(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function canManageOrders(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}

export function canManageSettings(role: string): boolean {
  return role === "OWNER";
}
