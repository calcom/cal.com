-- CreateEnum
CREATE TYPE "public"."SeatChangeType" AS ENUM ('ADDITION', 'REMOVAL');

-- CreateEnum
CREATE TYPE "public"."ProrationStatus" AS ENUM ('PENDING', 'INVOICE_CREATED', 'CHARGED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."OrganizationBilling" ADD COLUMN     "billingPeriod" "public"."BillingPeriod",
ADD COLUMN     "pricePerSeat" INTEGER,
ADD COLUMN     "paidSeats" INTEGER;

-- AlterTable
ALTER TABLE "public"."TeamBilling" ADD COLUMN     "billingPeriod" "public"."BillingPeriod",
ADD COLUMN     "pricePerSeat" INTEGER,
ADD COLUMN     "paidSeats" INTEGER;

-- CreateTable
CREATE TABLE "public"."SeatChangeLog" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "changeType" "public"."SeatChangeType" NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "userId" INTEGER,
    "triggeredBy" INTEGER,
    "changeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monthKey" TEXT NOT NULL,
    "processedInProrationId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teamBillingId" TEXT,
    "organizationBillingId" TEXT,

    CONSTRAINT "SeatChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlyProration" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "monthKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "seatsAtStart" INTEGER NOT NULL,
    "seatsAdded" INTEGER NOT NULL,
    "seatsRemoved" INTEGER NOT NULL,
    "netSeatIncrease" INTEGER NOT NULL,
    "seatsAtEnd" INTEGER NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionStart" TIMESTAMP(3) NOT NULL,
    "subscriptionEnd" TIMESTAMP(3) NOT NULL,
    "remainingDays" INTEGER NOT NULL,
    "pricePerSeat" INTEGER NOT NULL,
    "proratedAmount" INTEGER NOT NULL,
    "invoiceItemId" TEXT,
    "invoiceId" TEXT,
    "status" "public"."ProrationStatus" NOT NULL DEFAULT 'PENDING',
    "chargedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teamBillingId" TEXT,
    "organizationBillingId" TEXT,

    CONSTRAINT "MonthlyProration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatChangeLog_teamId_monthKey_idx" ON "public"."SeatChangeLog"("teamId", "monthKey");

-- CreateIndex
CREATE INDEX "SeatChangeLog_teamId_processedInProrationId_idx" ON "public"."SeatChangeLog"("teamId", "processedInProrationId");

-- CreateIndex
CREATE INDEX "SeatChangeLog_monthKey_idx" ON "public"."SeatChangeLog"("monthKey");

-- CreateIndex
CREATE INDEX "MonthlyProration_monthKey_status_idx" ON "public"."MonthlyProration"("monthKey", "status");

-- CreateIndex
CREATE INDEX "MonthlyProration_status_idx" ON "public"."MonthlyProration"("status");

-- CreateIndex
CREATE INDEX "MonthlyProration_teamId_idx" ON "public"."MonthlyProration"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyProration_teamId_monthKey_key" ON "public"."MonthlyProration"("teamId", "monthKey");

-- AddForeignKey
ALTER TABLE "public"."SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_processedInProrationId_fkey" FOREIGN KEY ("processedInProrationId") REFERENCES "public"."MonthlyProration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_teamBillingId_fkey" FOREIGN KEY ("teamBillingId") REFERENCES "public"."TeamBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatChangeLog" ADD CONSTRAINT "SeatChangeLog_organizationBillingId_fkey" FOREIGN KEY ("organizationBillingId") REFERENCES "public"."OrganizationBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyProration" ADD CONSTRAINT "MonthlyProration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyProration" ADD CONSTRAINT "MonthlyProration_teamBillingId_fkey" FOREIGN KEY ("teamBillingId") REFERENCES "public"."TeamBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyProration" ADD CONSTRAINT "MonthlyProration_organizationBillingId_fkey" FOREIGN KEY ("organizationBillingId") REFERENCES "public"."OrganizationBilling"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert feature flag (disabled by default)
INSERT INTO "public"."Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt")
VALUES ('monthly-proration', false, 'Monthly aggregated seat proration for annual plans', 'RELEASE', false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
