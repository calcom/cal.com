-- CreateEnum
CREATE TYPE "DunningStatus" AS ENUM ('CURRENT', 'WARNING', 'SOFT_BLOCKED', 'HARD_BLOCKED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TeamDunningStatus" (
    "id" TEXT NOT NULL,
    "teamBillingId" TEXT NOT NULL,
    "status" "DunningStatus" NOT NULL DEFAULT 'CURRENT',
    "firstFailedAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "failedInvoiceId" TEXT,
    "invoiceUrl" TEXT,
    "failureReason" TEXT,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDunningStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamDunningStatus_teamBillingId_key" ON "TeamDunningStatus"("teamBillingId");

-- CreateIndex
CREATE INDEX "TeamDunningStatus_status_idx" ON "TeamDunningStatus"("status");

-- AddForeignKey
ALTER TABLE "TeamDunningStatus" ADD CONSTRAINT "TeamDunningStatus_teamBillingId_fkey" FOREIGN KEY ("teamBillingId") REFERENCES "TeamBilling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "OrganizationDunningStatus" (
    "id" TEXT NOT NULL,
    "organizationBillingId" TEXT NOT NULL,
    "status" "DunningStatus" NOT NULL DEFAULT 'CURRENT',
    "firstFailedAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "failedInvoiceId" TEXT,
    "invoiceUrl" TEXT,
    "failureReason" TEXT,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDunningStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDunningStatus_organizationBillingId_key" ON "OrganizationDunningStatus"("organizationBillingId");

-- CreateIndex
CREATE INDEX "OrganizationDunningStatus_status_idx" ON "OrganizationDunningStatus"("status");

-- AddForeignKey
ALTER TABLE "OrganizationDunningStatus" ADD CONSTRAINT "OrganizationDunningStatus_organizationBillingId_fkey" FOREIGN KEY ("organizationBillingId") REFERENCES "OrganizationBilling"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed dunning-enforcement feature flag
INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('dunning-enforcement', false, 'OPERATIONAL', 'Tiered dunning enforcement for overdue invoices', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
