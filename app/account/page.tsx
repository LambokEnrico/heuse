import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Customer account page.
 * Shows order history and profile for logged-in customers.
 * Since this is a guest checkout store, most customers won't have accounts.
 */
export default async function AccountPage() {
  const session = await auth();

  // If not logged in, redirect to login
  if (!session?.user) {
    redirect("/login");
  }

  // For now, redirect to admin since customer accounts aren't fully implemented
  // In a full implementation, this would show order history, profile, etc.
  return (
    <div className="min-h-screen bg-heuse-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-heading text-4xl md:text-5xl mb-8">My Account</h1>
        <p className="text-heuse-muted">
          Welcome, {session.user.name || session.user.email}
        </p>
        <p className="text-heuse-muted mt-4">
          Customer account features are being developed. Please contact us for order inquiries.
        </p>
      </div>
    </div>
  );
}
