-- AddRefundFields
-- Adds 4 fields to Order model for PayPal refund tracking.
-- - refundedAt: timestamp when refund was issued (non-null = refunded)
-- - refundAmount: amount refunded, in the order's original currency (Decimal, optional for partial refunds)
-- - refundReason: free-text reason provided by admin
-- - refundId: PayPal refund transaction ID for reconciliation

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundAmount" DECIMAL(65,30),
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundId" TEXT;
