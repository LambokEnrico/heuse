"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/data-table";

/**
 * Pre-computed shape of a recent order row. Server pre-formats strings
 * (money, date) so this component stays a thin client renderer.
 */
export interface RecentOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  statusLabel: string;
  statusVariant: "default" | "secondary" | "destructive" | "gold";
  totalFormatted: string;
  createdAtFormatted: string;
}

interface RecentOrdersTableProps {
  orders: RecentOrderRow[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  const columns = [
    {
      key: "orderNumber",
      header: "Order",
      render: (order: RecentOrderRow) => (
        <Link
          href={`/admin/orders/${order.id}`}
          className="font-medium text-heuse-gold hover:underline"
        >
          {order.orderNumber}
        </Link>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
    },
    {
      key: "status",
      header: "Status",
      render: (order: RecentOrderRow) => (
        <Badge variant={order.statusVariant}>{order.statusLabel}</Badge>
      ),
    },
    {
      key: "totalFormatted",
      header: "Total",
    },
    {
      key: "createdAtFormatted",
      header: "Date",
    },
  ];

  return (
    <DataTable<RecentOrderRow>
      data={orders}
      columns={columns}
      keyField="id"
      emptyMessage="No orders yet"
    />
  );
}
