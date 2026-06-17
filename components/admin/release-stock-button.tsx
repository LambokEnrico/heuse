"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Undo2, Loader2 } from "lucide-react";
import { releaseOrderStock } from "@/app/actions";

interface Props {
  orderId: string;
  orderNumber: string;
  itemCount: number;
}

/**
 * Admin manual release-stock button.
 *
 * Visible only for orders in AWAITING_PAYMENT + UNPAID state (passed by
 * parent as a render gate). On confirm:
 *   1. Releases stock on productVariant for all items
 *   2. Marks order as CANCELLED with audit note
 *   3. Refreshes the page
 *
 * Idempotent: re-running on a cancelled order returns ALREADY_CANCELLED.
 */
export function ReleaseStockButton({ orderId, orderNumber, itemCount }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      const result = await releaseOrderStock({ orderId });

      if (!result.success) {
        toast({
          title: "Cannot release stock",
          description: result.error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Stock released",
        description: `${itemCount} item(s) returned to inventory. Order ${orderNumber} marked CANCELLED.`,
      });
      setIsOpen(false);
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
        <Button variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
          <Undo2 className="w-4 h-4 mr-2" />
          Release Stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release stock for {orderNumber}?</DialogTitle>
          <DialogDescription>
            This will return {itemCount} item(s) to the catalog and mark the
            order as <span className="font-mono text-amber-300">CANCELLED</span>.
            <br />
            <br />
            <span className="text-xs text-heuse-muted">
              Use this when a customer abandons checkout. The 24-hour cron will
              also release this stock automatically, but this is instant.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-amber-500 text-heuse-black hover:bg-amber-400"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Releasing...
              </>
            ) : (
              <>
                <Undo2 className="w-4 h-4 mr-2" />
                Release Stock
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
