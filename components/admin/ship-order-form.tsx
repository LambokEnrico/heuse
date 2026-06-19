"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Truck, ExternalLink, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shipOrder } from "@/app/actions";
import { formatDate } from "@/lib/utils";

const shipFormSchema = z.object({
  trackingNumber: z.string().min(2, "Required (min 2 chars)").max(120),
  trackingCarrier: z.string().min(2, "Required (min 2 chars)").max(60),
  notifyCustomer: z.boolean(),
});

type ShipFormData = z.infer<typeof shipFormSchema>;

interface ShipOrderFormProps {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  /** Pre-filled values if order was previously shipped */
  defaultTrackingNumber?: string;
  defaultTrackingCarrier?: string;
  /** Timestamp if already shipped */
  shippedAt?: Date | null;
  /** Tracking link to show in success state */
  trackingUrl?: string;
  /** True if order already shipped (show read-only info + re-ship option) */
  alreadyShipped: boolean;
}

const CARRIERS = [
  { value: "JNE", label: "JNE" },
  { value: "SiCepat", label: "SiCepat" },
  { value: "J&T", label: "J&T Express" },
  { value: "AnterAja", label: "AnterAja" },
  { value: "Pos", label: "Pos Indonesia" },
  { value: "Ninja", label: "Ninja Xpress" },
  { value: "Lion", label: "Lion Parcel" },
  { value: "Other", label: "Other (type below)" },
];

export function ShipOrderForm({
  orderId,
  orderNumber,
  customerEmail,
  defaultTrackingNumber = "",
  defaultTrackingCarrier = "JNE",
  shippedAt,
  trackingUrl,
  alreadyShipped,
}: ShipOrderFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(!alreadyShipped);

  const form = useForm<ShipFormData>({
    resolver: zodResolver(shipFormSchema),
    defaultValues: {
      trackingNumber: defaultTrackingNumber,
      trackingCarrier: defaultTrackingCarrier,
      notifyCustomer: true,
    },
  });

  const onSubmit = async (data: ShipFormData) => {
    setIsSubmitting(true);
    try {
      const result = await shipOrder({
        orderId,
        trackingNumber: data.trackingNumber,
        trackingCarrier: data.trackingCarrier,
        notifyCustomer: data.notifyCustomer,
      });

      if (!result.success) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Order shipped",
        description: `Tracking ${data.trackingNumber} set. Customer ${
          data.notifyCustomer ? "will be emailed" : "not notified"
        }.`,
      });

      router.refresh();
      setShowForm(false);
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTrackingLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    toast({ title: "Copied", description: "Tracking link copied to clipboard" });
  };

  // Read-only shipped state
  if (alreadyShipped && !showForm) {
    return (
      <div className="space-y-3">
        <div className="bg-heuse-gold/5 border border-heuse-gold/30 rounded-md p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-heuse-gold" />
            <p className="text-sm font-medium text-heuse-gold">
              Order shipped
            </p>
          </div>
          <div className="text-xs space-y-1">
            <p className="text-heuse-muted">
              Carrier:{" "}
              <span className="text-heuse-text font-medium">
                {defaultTrackingCarrier}
              </span>
            </p>
            <p className="text-heuse-muted">
              Tracking #:{" "}
              <span className="text-heuse-text font-mono">
                {defaultTrackingNumber}
              </span>
            </p>
            {shippedAt && (
              <p className="text-heuse-muted">
                Shipped on {formatDate(new Date(shippedAt))}
              </p>
            )}
          </div>
        </div>

        {trackingUrl && (
          <div className="flex items-center gap-2">
            <Input value={trackingUrl} readOnly className="text-xs font-mono" />
            <Button
              variant="outline"
              size="icon"
              onClick={copyTrackingLink}
              title="Copy link"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" asChild title="Open tracking page">
              <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(true)}
        >
          Update tracking info
        </Button>
      </div>
    );
  }

  // Edit / create form
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="trackingCarrier">Carrier</Label>
        <select
          id="trackingCarrier"
          {...form.register("trackingCarrier")}
          className="w-full bg-transparent border border-heuse-border h-10 px-3 text-sm"
        >
          {CARRIERS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {form.formState.errors.trackingCarrier && (
          <p className="text-red-500 text-xs">
            {form.formState.errors.trackingCarrier.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="trackingNumber">Tracking Number</Label>
        <Input
          id="trackingNumber"
          {...form.register("trackingNumber")}
          placeholder="e.g. JNE20260619001"
          className="font-mono"
        />
        {form.formState.errors.trackingNumber && (
          <p className="text-red-500 text-xs">
            {form.formState.errors.trackingNumber.message}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          {...form.register("notifyCustomer")}
          defaultChecked
          className="w-4 h-4 accent-heuse-gold"
        />
        <span className="text-sm">
          Send shipping notification to {customerEmail}
        </span>
      </label>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-heuse-gold text-heuse-black hover:bg-[#c9a862]"
        >
          <Truck className="w-4 h-4 mr-2" />
          {isSubmitting
            ? "Shipping..."
            : alreadyShipped
            ? "Update tracking"
            : "Mark as Shipped"}
        </Button>
        {alreadyShipped && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
        )}
      </div>

      {!alreadyShipped && (
        <p className="text-xs text-heuse-muted flex items-start gap-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>
            Sets fulfillment status to SHIPPED, stamps shippedAt timestamp, and
            (optionally) emails the customer with a 1-year magic tracking link.
          </span>
        </p>
      )}
    </form>
  );
}
