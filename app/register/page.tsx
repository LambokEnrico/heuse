import { redirect } from "next/navigation";

/**
 * Customer registration page.
 * Currently, this is a guest checkout store - no customer accounts exist.
 * All customers checkout as guests.
 * Registration would be implemented here if customer accounts are added.
 */
export default async function RegisterPage() {
  // For now: redirect to products since this is a guest checkout store
  redirect("/products");
}
