export const dynamic = "force-dynamic";

import { SessionProvider } from "next-auth/react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarProvider } from "@/components/admin/sidebar-context";
import { AdminHeader } from "@/components/admin/admin-header";
import { cn } from "@/lib/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
    <SidebarProvider>
      <AdminSidebar />
      <AdminHeader />
      <main
        className={cn(
          "pt-16 pl-64 min-h-screen bg-heuse-black transition-all duration-300"
        )}
        id="admin-content"
      >
        <div className="p-6">{children}</div>
      </main>
    </SidebarProvider>
    </SessionProvider>
  );
}