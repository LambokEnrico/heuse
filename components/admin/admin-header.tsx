"use client";

import { useSidebar } from "@/components/admin/sidebar-context";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminHeader() {
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 bg-heuse-dark border-b border-heuse-border transition-all duration-300 flex items-center justify-between px-6",
        collapsed ? "left-[72px]" : "left-64"
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-2 hover:bg-heuse-dark/50 rounded-sm text-heuse-muted hover:text-heuse-gold transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-heuse-text">
            {session?.user?.name ?? "Admin"}
          </p>
          <p className="text-xs text-heuse-muted">
            {session?.user?.role ?? "ADMIN"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="text-heuse-muted hover:text-heuse-crimson"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}