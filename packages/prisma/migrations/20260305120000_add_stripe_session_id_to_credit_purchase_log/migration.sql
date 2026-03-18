-- AlterTable
ALTER TABLE "CreditPurchaseLog" ADD COLUMN "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchaseLog_stripeSessionId_key" ON "CreditPurchaseLog"("stripeSessionId");
