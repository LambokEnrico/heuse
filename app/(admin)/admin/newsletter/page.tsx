"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface Subscriber {
  id: string;
  email: string;
  source: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminNewsletterPage() {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/admin/newsletter");
      if (res.ok) {
        const data = await res.json();
        setSubscribers(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load subscribers", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "email",
      header: "Email",
      render: (sub: Subscriber) => (
        <span className="font-medium text-heuse-text">{sub.email}</span>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (sub: Subscriber) => sub.source || "-",
    },
    {
      key: "createdAt",
      header: "Date",
      render: (sub: Subscriber) => formatDate(new Date(sub.createdAt)),
    },
    {
      key: "active",
      header: "Status",
      render: (sub: Subscriber) => (
        <Badge variant={sub.active ? "default" : "secondary"}>
          {sub.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          Newsletter
        </h1>
        <p className="text-heuse-muted mt-1">
          {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-heuse-dark border border-heuse-border rounded-sm">
        <DataTable
          data={subscribers}
          columns={columns}
          keyField="id"
          loading={loading}
          emptyMessage="No newsletter subscribers yet"
        />
      </div>
    </div>
  );
}
