import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Customer login page.
 * Currently, authentication is only available for admin users.
 * This page redirects admin users to the admin login.
 * Regular customers: use the checkout flow (guest checkout, no account needed).
 */
export default async function LoginPage() {
  const session = await auth();

  // If already logged in as admin, redirect to admin dashboard
  if (session?.user?.role === "ADMIN" || session?.user?.role === "OWNER") {
    redirect("/admin");
  }

  // For customers: this is a guest checkout store - no customer accounts exist
  // Redirect to products to continue shopping
  redirect("/products");
}
