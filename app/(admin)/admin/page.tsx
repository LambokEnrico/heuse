import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/admin/stats-card";
import { RecentOrdersTable, type RecentOrderRow } from "@/components/admin/recent-orders-table";
import { formatMoney, formatDate } from "@/lib/utils";
import {
  ShoppingCart,
  Clock,
  Package,
  CheckCircle,
  Boxes,
  Mail,
} from "lucide-react";
import Link from "next/link";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
  PENDING_CONFIRMATION: "gold",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "secondary",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/admin/login");
  }

  // Fetch stats
  const [
    totalOrders,
    pendingOrders,
    totalProducts,
    publishedProducts,
    totalUnits,
    availableUnits,
    newsletterSubscribers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING_CONFIRMATION" } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "PUBLISHED" } }),
    prisma.editionUnit.count(),
    prisma.editionUnit.count({ where: { status: "AVAILABLE" } }),
    prisma.newsletterSubscriber.count({ where: { active: true } }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
  ]);

  const recentOrderRows: RecentOrderRow[] = recentOrders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    status: order.status,
    statusLabel: order.status.replace(/_/g, " "),
    statusVariant: STATUS_VARIANT[order.status] || "secondary",
    totalFormatted: formatMoney(Number(order.total)),
    createdAtFormatted: formatDate(order.createdAt),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          Dashboard
        </h1>
        <p className="text-heuse-muted mt-1">
          Welcome back, {session.user.name || "Admin"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
        />
        <StatsCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Clock}
        />
        <StatsCard
          title="Total Products"
          value={totalProducts}
          icon={Package}
        />
        <StatsCard
          title="Published Products"
          value={publishedProducts}
          icon={CheckCircle}
        />
        <StatsCard
          title="Available Units"
          value={availableUnits}
          icon={Boxes}
        />
        <StatsCard
          title="Newsletter Subscribers"
          value={newsletterSubscribers}
          icon={Mail}
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-heuse-dark border border-heuse-border rounded-sm">
        <div className="p-6 border-b border-heuse-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-heading font-semibold text-heuse-cream">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm text-heuse-gold hover:underline"
            >
              View all
</Link>
          </div>
        </div>
        <RecentOrdersTable orders={recentOrderRows} />
      </div>
    </div>
  );
}
