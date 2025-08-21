-- CreateTable
CREATE TABLE "CreditPurchaseLog" (
    "id" TEXT NOT NULL,
    "creditBalanceId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchaseLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CreditPurchaseLog" ADD CONSTRAINT "CreditPurchaseLog_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
