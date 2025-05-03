-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('UPSTREAM', 'DOWNSTREAM');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "calendarSyncId" TEXT;

-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "calendarSyncId" TEXT;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "providerType" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "providerSubscriptionKind" TEXT,
    "providerResourceId" TEXT,
    "providerResourceUri" TEXT,
    "providerExpiration" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calendarSyncId" TEXT,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSync" (
    "id" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "integration" TEXT NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscriptionId" TEXT,
    "lastSyncedUpAt" TIMESTAMP(3),
    "lastSyncedDownAt" TIMESTAMP(3),
    "lastSyncDirection" "Direction" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_credentialId_idx" ON "Subscription"("credentialId");

-- CreateIndex
CREATE INDEX "Subscription_providerSubscriptionId_idx" ON "Subscription"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_credentialId_externalCalendarId_key" ON "Subscription"("credentialId", "externalCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_subscriptionId_key" ON "CalendarSync"("subscriptionId");

-- CreateIndex
CREATE INDEX "CalendarSync_externalCalendarId_idx" ON "CalendarSync"("externalCalendarId");

-- CreateIndex
CREATE INDEX "CalendarSync_subscriptionId_idx" ON "CalendarSync"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSync_credentialId_externalCalendarId_key" ON "CalendarSync"("credentialId", "externalCalendarId");

-- CreateIndex
CREATE INDEX "BookingReference_calendarEventId_idx" ON "BookingReference"("calendarEventId");

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_calendarSyncId_fkey" FOREIGN KEY ("calendarSyncId") REFERENCES "CalendarSync"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_calendarSyncId_fkey" FOREIGN KEY ("calendarSyncId") REFERENCES "CalendarSync"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSync" ADD CONSTRAINT "CalendarSync_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
