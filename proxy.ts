/**
 * NextAuth middleware — protects /admin/* routes.
 *
 * Public:    /admin/login
 * Protected: every other /admin/* path
 *
 * When unauthenticated, redirect to /admin/login with callbackUrl.
 * Per-page role checks (e.g. requireRole('OWNER')) are still needed
 * inside protected pages — middleware only verifies authentication.
 *
 * Security note: this middleware was added 2026-06-15 to fix a P0 issue
 * where 7 admin pages (categories, drops, leads, newsletter, orders,
 * orders/[id], settings) had no auth check and were publicly accessible.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAdmin = req.nextUrl.pathname.startsWith("/admin");
  const isOnLogin = req.nextUrl.pathname === "/admin/login";

  if (isOnAdmin && !isOnLogin && !isLoggedIn) {
    const loginUrl = new URL("/admin/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on all /admin/* paths except Next.js internals
  matcher: ["/admin/:path*"],
};
