-- AlterTable
ALTER TABLE "PlatformBilling" ADD COLUMN     "managerBillingId" INTEGER;

-- AddForeignKey
ALTER TABLE "PlatformBilling" ADD CONSTRAINT "PlatformBilling_managerBillingId_fkey" FOREIGN KEY ("managerBillingId") REFERENCES "PlatformBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;
