"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrderStatus } from "@/app/actions";

const orderStatusSchema = z.object({
  orderId: z.string(),
  status: z.enum(["PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED", "COMPLETED"]),
  paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PACKED", "SHIPPED", "DELIVERED"]),
  internalNote: z.string().optional(),
});

type OrderStatusFormData = z.infer<typeof orderStatusSchema>;

interface OrderStatusFormProps {
  order: {
    id: string;
    status: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    internalNote: string | null;
  };
}

const ORDER_STATUSES = [
  { value: "PENDING_CONFIRMATION", label: "Pending Confirmation" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "COMPLETED", label: "Completed" },
];

const PAYMENT_STATUSES = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
];

const FULFILLMENT_STATUSES = [
  { value: "UNFULFILLED", label: "Unfulfilled" },
  { value: "PACKED", label: "Packed" },
  { value: "SHIPPED", label: "Shipped" },
  { value: "DELIVERED", label: "Delivered" },
];

export function OrderStatusForm({ order }: OrderStatusFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OrderStatusFormData>({
    resolver: zodResolver(orderStatusSchema),
    defaultValues: {
      orderId: order.id,
      status: order.status as OrderStatusFormData["status"],
      paymentStatus: order.paymentStatus as OrderStatusFormData["paymentStatus"],
      fulfillmentStatus: order.fulfillmentStatus as OrderStatusFormData["fulfillmentStatus"],
      internalNote: order.internalNote || "",
    },
  });

  const onSubmit = async (data: OrderStatusFormData) => {
    setIsSubmitting(true);
    try {
      const result = await updateOrderStatus({
        orderId: data.orderId,
        status: data.status,
        paymentStatus: data.paymentStatus,
        fulfillmentStatus: data.fulfillmentStatus,
        internalNote: data.internalNote,
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
        title: "Success",
        description: "Order status updated successfully",
      });

      router.refresh();
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Order Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) =>
              form.setValue("status", value as OrderStatusFormData["status"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select
            value={form.watch("paymentStatus")}
            onValueChange={(value) =>
              form.setValue(
                "paymentStatus",
                value as OrderStatusFormData["paymentStatus"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fulfillmentStatus">Fulfillment Status</Label>
          <Select
            value={form.watch("fulfillmentStatus")}
            onValueChange={(value) =>
              form.setValue(
                "fulfillmentStatus",
                value as OrderStatusFormData["fulfillmentStatus"]
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="internalNote">Internal Note</Label>
        <Textarea
          id="internalNote"
          {...form.register("internalNote")}
          placeholder="Add internal notes about this order..."
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
