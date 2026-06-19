-- AddDiscountAndTracking
-- Adds two features in one migration:
--
-- 1. Discount / promo codes (DiscountCode + DiscountUsage models, plus
--    discount fields on Order).
-- 2. Customer order tracking (trackingToken + trackingNumber/Carrier +
--    shippedAt/deliveredAt on Order).
--
-- Reason for grouping: both modify Order schema and need to ship together
-- with the corresponding feature work. Keeps deploy count down.

-- ============================================
-- DISCOUNT TABLES
-- ============================================

-- CreateTable: DiscountCode
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "minPurchase" DECIMAL(65,30),
    "maxDiscount" DECIMAL(65,30),
    "expiresAt" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "perCustomerLimit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DiscountUsage
CREATE TABLE "DiscountUsage" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: DiscountCode
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_active_idx" ON "DiscountCode"("active");
CREATE INDEX "DiscountCode_expiresAt_idx" ON "DiscountCode"("expiresAt");

-- CreateIndex: DiscountUsage
CREATE UNIQUE INDEX "DiscountUsage_orderId_key" ON "DiscountUsage"("orderId");
CREATE INDEX "DiscountUsage_discountId_customerEmail_idx" ON "DiscountUsage"("discountId", "customerEmail");
CREATE INDEX "DiscountUsage_customerEmail_idx" ON "DiscountUsage"("customerEmail");

-- AddForeignKey: DiscountUsage -> DiscountCode
ALTER TABLE "DiscountUsage" ADD CONSTRAINT "DiscountUsage_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ORDER SCHEMA ADDITIONS
-- ============================================

-- AlterTable: Order (add discount + tracking fields)
ALTER TABLE "Order" ADD COLUMN     "trackingToken" TEXT,
ADD COLUMN     "trackingTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingCarrier" TEXT,
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "discountType" TEXT,
ADD COLUMN     "discountValue" DECIMAL(65,30),
ADD COLUMN     "discountAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- CreateIndex: Order.trackingToken (unique for magic-link tracking)
CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");
