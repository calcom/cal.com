-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "CalendarSyncStatus" AS ENUM ('IDLE', 'SYNCING', 'ERROR');

-- CreateEnum
CREATE TYPE "CalendarCursorType" AS ENUM ('GOOGLE_SYNC_TOKEN', 'OUTLOOK_DELTA_LINK');

-- CreateTable
CREATE TABLE "ExternalCalendar" (
    "id" SERIAL NOT NULL,
    "credentialId" INTEGER NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "providerCalendarId" TEXT NOT NULL,
    "calendarName" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarSyncCursor" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "cursor" TEXT NOT NULL,
    "cursorType" "CalendarCursorType" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "lastDeltaSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarSyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarSubscription" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "resourceId" TEXT,
    "webhookUrl" TEXT NOT NULL,
    "clientState" TEXT,
    "expirationDateTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL,
    "showAsBusy" BOOLEAN NOT NULL,
    "status" TEXT,
    "providerUpdatedAt" TIMESTAMP(3),
    "sequence" INTEGER,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCalendar_credentialId_idx" ON "ExternalCalendar"("credentialId");

-- CreateIndex
CREATE INDEX "ExternalCalendar_syncEnabled_idx" ON "ExternalCalendar"("syncEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendar_credentialId_providerCalendarId_key" ON "ExternalCalendar"("credentialId", "providerCalendarId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarSyncCursor_calendarId_key" ON "ExternalCalendarSyncCursor"("calendarId");

-- CreateIndex
CREATE INDEX "ExternalCalendarSubscription_calendarId_idx" ON "ExternalCalendarSubscription"("calendarId");

-- CreateIndex
CREATE INDEX "ExternalCalendarSubscription_expirationDateTime_idx" ON "ExternalCalendarSubscription"("expirationDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarSubscription_provider_subscriptionId_key" ON "ExternalCalendarSubscription"("provider", "subscriptionId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_userId_idx" ON "ExternalCalendarEvent"("userId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_startTime_endTime_idx" ON "ExternalCalendarEvent"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_iCalUID_idx" ON "ExternalCalendarEvent"("iCalUID");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_recurringEventId_idx" ON "ExternalCalendarEvent"("recurringEventId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_calendarId_startTime_endTime_idx" ON "ExternalCalendarEvent"("calendarId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarEvent_calendarId_externalEventId_key" ON "ExternalCalendarEvent"("calendarId", "externalEventId");

-- AddForeignKey
ALTER TABLE "ExternalCalendar" ADD CONSTRAINT "ExternalCalendar_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarSyncCursor" ADD CONSTRAINT "ExternalCalendarSyncCursor_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarSubscription" ADD CONSTRAINT "ExternalCalendarSubscription_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarEvent" ADD CONSTRAINT "ExternalCalendarEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
