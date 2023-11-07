-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "billingCycleStart" INTEGER,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "subscriptionId" TEXT;
