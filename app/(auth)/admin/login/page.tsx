import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-heuse-black px-4">
      <div className="w-full max-w-md bg-heuse-dark border border-heuse-border p-8 animate-pulse">
        <div className="h-8 bg-heuse-border rounded mb-4 mx-auto w-32" />
        <div className="space-y-3 mt-6">
          <div className="h-10 bg-heuse-border rounded" />
          <div className="h-10 bg-heuse-border rounded" />
          <div className="h-10 bg-heuse-border rounded" />
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}