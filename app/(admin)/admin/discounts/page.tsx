"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Power, PowerOff, Loader2 } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";

interface DiscountCode {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string; // Prisma Decimal returned as string
  minPurchase: string | null;
  maxDiscount: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  perCustomerLimit: number | null;
  active: boolean;
  description: string | null;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "",
  type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
  value: "",
  minPurchase: "",
  maxDiscount: "",
  expiresAt: "",
  usageLimit: "",
  perCustomerLimit: "",
  active: true,
  description: "",
};

export default function AdminDiscountsPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/discounts?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setCodes(data.data ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load codes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      const body: any = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        active: form.active,
      };
      if (form.minPurchase) body.minPurchase = Number(form.minPurchase);
      if (form.type === "PERCENTAGE" && form.maxDiscount) body.maxDiscount = Number(form.maxDiscount);
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
      if (form.usageLimit) body.usageLimit = Number(form.usageLimit);
      if (form.perCustomerLimit) body.perCustomerLimit = Number(form.perCustomerLimit);
      if (form.description) body.description = form.description;

      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }

      toast({ title: "Created", description: `Code ${form.code.toUpperCase()} ready to use` });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        toast({ title: active ? "Activated" : "Deactivated" });
        load();
      }
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const remove = async (id: string, code: string) => {
    if (!confirm(`Delete code "${code}"? Codes with usage history will be deactivated instead.`)) return;
    try {
      const res = await fetch(`/api/admin/discounts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: data.deactivated ? "Deactivated" : "Deleted",
          description: data.message || `Code ${code} removed`,
        });
        load();
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: `${code} copied to clipboard` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-heuse-cream">
            Discount Codes
          </h1>
          <p className="text-heuse-muted mt-1">
            {codes.length} code{codes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Code
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Search by code or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Button variant="outline" onClick={load}>
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="bg-heuse-dark border border-heuse-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-heuse-gold" />
          </div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-heuse-muted">
            No discount codes yet. Click "New Code" to create your first one.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-heuse-black/50">
              <tr className="border-b border-heuse-border">
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Code</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Value</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Usage</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Expires</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-heuse-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => {
                const valueDisplay =
                  c.type === "PERCENTAGE"
                    ? `${c.value}%`
                    : formatMoney(Number(c.value));
                const usageDisplay = c.usageLimit
                  ? `${c.usageCount} / ${c.usageLimit}`
                  : `${c.usageCount} / ∞`;
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                return (
                  <tr key={c.id} className="border-b border-heuse-border hover:bg-heuse-black/30">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-heuse-gold tracking-wider">
                          {c.code}
                        </span>
                        <button
                          onClick={() => copyCode(c.code)}
                          className="text-heuse-muted hover:text-heuse-text transition-colors"
                          aria-label="Copy code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {c.description && (
                        <p className="text-xs text-heuse-muted mt-1 line-clamp-1">
                          {c.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{c.type}</Badge>
                    </td>
                    <td className="py-3 px-4 font-medium">{valueDisplay}</td>
                    <td className="py-3 px-4 text-sm">{usageDisplay}</td>
                    <td className="py-3 px-4 text-sm text-heuse-muted">
                      {c.expiresAt ? (
                        <span className={expired ? "text-red-400" : ""}>
                          {formatDate(new Date(c.expiresAt))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={c.active && !expired ? "default" : "destructive"}>
                        {expired ? "EXPIRED" : c.active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(c.id, !c.active)}
                          title={c.active ? "Deactivate" : "Activate"}
                        >
                          {c.active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(c.id, c.code)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-heuse-dark border-heuse-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">New Discount Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="LAUNCH20"
                  className="font-mono uppercase tracking-wider"
                  maxLength={32}
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full bg-transparent border border-heuse-border h-10 px-3 text-sm"
                >
                  <option value="PERCENTAGE">%</option>
                  <option value="FIXED">Rp</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="value">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "PERCENTAGE" ? "20" : "50000"}
                />
                <p className="text-xs text-heuse-muted mt-1">
                  {form.type === "PERCENTAGE" ? "% off subtotal" : "Rp off subtotal"}
                </p>
              </div>
              {form.type === "PERCENTAGE" && (
                <div>
                  <Label htmlFor="maxDiscount">Max Discount (cap)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    placeholder="200000"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="minPurchase">Min Purchase</Label>
                <Input
                  id="minPurchase"
                  type="number"
                  value={form.minPurchase}
                  onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                  placeholder="1000000"
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="usageLimit">Total Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="100 (blank = unlimited)"
                />
              </div>
              <div>
                <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
                <Input
                  id="perCustomerLimit"
                  type="number"
                  value={form.perCustomerLimit}
                  onChange={(e) => setForm({ ...form, perCustomerLimit: e.target.value })}
                  placeholder="1 (blank = unlimited)"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description (internal)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Launch promo, VIP-only, etc."
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 accent-heuse-gold"
              />
              <span className="text-sm">Active (can be redeemed)</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !form.code || !form.value}
              className="bg-heuse-gold text-heuse-black hover:bg-[#c9a862]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Code"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
