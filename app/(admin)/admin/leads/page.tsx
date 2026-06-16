"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

interface ContactSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  subject: string;
  status: string;
  createdAt: string;
}

interface WaitlistEntry {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  sizeInterest: string | null;
  status: string;
  createdAt: string;
}

export default function AdminLeadsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const [contactsRes, waitlistRes] = await Promise.all([
        fetch("/api/admin/contacts"),
        fetch("/api/admin/waitlist"),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(Array.isArray(data) ? data : data.data ?? []);
      }
      if (waitlistRes.ok) {
        const data = await waitlistRes.json();
        setWaitlist(Array.isArray(data) ? data : data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const contactColumns = [
    {
      key: "fullName",
      header: "Name",
      render: (contact: ContactSubmission) => (
        <div>
          <p className="font-medium text-heuse-text">{contact.fullName}</p>
          <p className="text-xs text-heuse-muted">{contact.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (contact: ContactSubmission) => contact.phone || "-",
    },
    { key: "subject", header: "Subject" },
    {
      key: "status",
      header: "Status",
      render: (contact: ContactSubmission) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
          NEW: "gold",
          CONTACTED: "default",
          CONVERTED: "secondary",
          CLOSED: "destructive",
        };
        return (
          <Badge variant={variants[contact.status] || "secondary"}>
            {contact.status}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (contact: ContactSubmission) => formatDate(new Date(contact.createdAt)),
    },
  ];

  const waitlistColumns = [
    {
      key: "fullName",
      header: "Name",
      render: (entry: WaitlistEntry) => (
        <div>
          <p className="font-medium text-heuse-text">{entry.fullName}</p>
          <p className="text-xs text-heuse-muted">{entry.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (entry: WaitlistEntry) => entry.phone || "-",
    },
    {
      key: "sizeInterest",
      header: "Size Interest",
      render: (entry: WaitlistEntry) => entry.sizeInterest || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (entry: WaitlistEntry) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "gold"> = {
          NEW: "gold",
          CONTACTED: "default",
          CONVERTED: "secondary",
          CLOSED: "destructive",
        };
        return (
          <Badge variant={variants[entry.status] || "secondary"}>
            {entry.status}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Date",
      render: (entry: WaitlistEntry) => formatDate(new Date(entry.createdAt)),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
          Leads
        </h1>
        <p className="text-heuse-muted mt-1">Contact submissions and waitlist entries</p>
      </div>

      <Tabs defaultValue="contacts" className="w-full">
        <TabsList>
          <TabsTrigger value="contacts">
            Contact Submissions ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="waitlist">
            Waitlist Entries ({waitlist.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <div className="bg-heuse-dark border border-heuse-border rounded-sm">
            <DataTable
              data={contacts}
              columns={contactColumns}
              keyField="id"
              loading={loading}
              emptyMessage="No contact submissions yet"
            />
          </div>
        </TabsContent>

        <TabsContent value="waitlist">
          <div className="bg-heuse-dark border border-heuse-border rounded-sm">
            <DataTable
              data={waitlist}
              columns={waitlistColumns}
              keyField="id"
              loading={loading}
              emptyMessage="No waitlist entries yet"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
