"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, formatDate } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const url = statusFilter === "all"
        ? "/api/admin/orders"
        : `/api/admin/orders?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "orderNumber",
      header: "Order",
      render: (order: Order) => (
        <span className="font-medium text-heuse-gold">{order.orderNumber}</span>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
    },
    {
      key: "status",
      header: "Status",
      render: (order: Order) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
          PENDING_CONFIRMATION: "gold",
          CONFIRMED: "default",
          CANCELLED: "destructive",
          COMPLETED: "secondary",
        };
        return (
          <Badge variant={variants[order.status] || "secondary"}>
            {order.status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      key: "paymentStatus",
      header: "Payment",
      render: (order: Order) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
          UNPAID: "destructive",
          PAID: "default",
          REFUNDED: "secondary",
        };
        return (
          <Badge variant={variants[order.paymentStatus] || "secondary"}>
            {order.paymentStatus}
          </Badge>
        );
      },
    },
    {
      key: "total",
      header: "Total",
      render: (order: Order) => formatMoney(order.total),
    },
    {
      key: "createdAt",
      header: "Date",
      render: (order: Order) => formatDate(new Date(order.createdAt)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
            Orders
          </h1>
          <p className="text-heuse-muted mt-1">
            {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="PENDING_CONFIRMATION">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm">
        <DataTable
          data={orders}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No orders found"
          onRowClick={(order) => router.push(`/admin/orders/${order.id}`)}
        />
      </div>
    </div>
  );
}
