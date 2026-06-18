"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { refundOrder } from "@/app/actions";

const refundFormSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(100_000_000, "Amount too large"),
  reason: z.string().max(500, "Reason too long (max 500 chars)").optional(),
});

type RefundFormData = z.infer<typeof refundFormSchema>;

interface Props {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  currency?: string;
}

/**
 * Admin refund button with confirmation dialog.
 *
 * - Visible only for PAID orders (render-gated by parent)
 * - Default amount = full order total
 * - On submit: calls `refundOrder` server action
 *   - PayPal issues refund
 *   - Stock released
 *   - Email sent to customer
 *   - Order status updated to REFUNDED + CANCELLED
 *
 * Use case: customer requested refund, item out of stock, or any post-payment
 * cancellation. For unpaid order stock release, use `ReleaseStockButton`
 * (different flow, no money movement).
 */
export function RefundButton({
  orderId,
  orderNumber,
  orderTotal,
  currency = "IDR",
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RefundFormData>({
    resolver: zodResolver(refundFormSchema),
    defaultValues: {
      amount: orderTotal,
      reason: "",
    },
  });

  const watchedAmount = form.watch("amount");
  const isPartial = watchedAmount && watchedAmount < orderTotal;

  async function onSubmit(data: RefundFormData) {
    setIsSubmitting(true);
    try {
      const result = await refundOrder({
        orderId,
        amount: data.amount,
        reason: data.reason || undefined,
      });

      if (!result.success) {
        toast({
          title: "Refund failed",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Refund issued",
        description: `Order ${orderNumber} refunded. Funds will return to customer in 3-5 business days.`,
      });
      setIsOpen(false);
      form.reset();
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10">
          <RotateCcw className="w-4 h-4 mr-2" />
          Refund Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund {orderNumber}</DialogTitle>
          <DialogDescription>
            Issue a PayPal refund. The money will be returned to the
            customer&apos;s original payment method.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              This action cannot be undone. PayPal will process the refund
              immediately and stock will be returned to inventory.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-amount">
              Refund Amount ({currency})
            </Label>
            <Input
              id="refund-amount"
              type="number"
              step="any"
              min="0"
              max={orderTotal}
              {...form.register("amount", { valueAsNumber: true })}
            />
            <div className="flex justify-between text-xs text-heuse-muted">
              <span>Order total: {formatMoney(orderTotal)}</span>
              {isPartial && (
                <span className="text-amber-300">Partial refund</span>
              )}
            </div>
            {form.formState.errors.amount && (
              <p className="text-xs text-red-400">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">
              Reason <span className="text-heuse-muted">(optional)</span>
            </Label>
            <Textarea
              id="refund-reason"
              {...form.register("reason")}
              placeholder="e.g. Customer changed mind, item damaged in transit, etc."
              rows={3}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-red-400">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Issue Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
