-- CreateEnum
CREATE TYPE "CalendarSubscriptionStatus" AS ENUM ('ACTIVE', 'PENDING', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarSyncDirection" AS ENUM ('UPSTREAM', 'DOWNSTREAM');

-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "calendarSyncId" TEXT;

-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerSubscriptionKind" TEXT,
    "providerResourceId" TEXT,
    "providerResourceUri" TEXT,
    "providerExpiration" TIMESTAMP(3),
    "status" "CalendarSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "calendarSyncId" TEXT,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscriptionId" TEXT,
    "lastSyncedUpAt" TIMESTAMP(3),
    "lastSyncedDownAt" TIMESTAMP(3),
    "lastSyncDirection" "CalendarSyncDirection",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarSubscription_credentialId_idx" ON "CalendarSubscription"("credentialId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_providerSubscriptionId_idx" ON "CalendarSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_credentialId_externalCalendarId_key" ON "CalendarSubscription"("credentialId", "externalCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_subscriptionId_key" ON "CalendarSync"("subscriptionId");

-- CreateIndex
CREATE INDEX "CalendarSync_externalCalendarId_idx" ON "CalendarSync"("externalCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_userId_externalCalendarId_integration_key" ON "CalendarSync"("userId", "externalCalendarId", "integration");

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_calendarSyncId_fkey" FOREIGN KEY ("calendarSyncId") REFERENCES "CalendarSync"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
