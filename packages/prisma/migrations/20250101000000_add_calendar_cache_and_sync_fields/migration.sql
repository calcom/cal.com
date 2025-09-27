/*
  Warnings:

  - Added calendar cache and sync fields to SelectedCalendar table
  - Created CalendarCacheEvent table with CalendarCacheEventStatus enum

*/

CREATE TYPE "CalendarCacheEventStatus" AS ENUM ('confirmed', 'tentative', 'cancelled');

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "channelKind" TEXT,
ADD COLUMN     "channelResourceId" TEXT,
ADD COLUMN     "channelResourceUri" TEXT,
ADD COLUMN     "channelExpiration" TIMESTAMP(3),
ADD COLUMN     "syncSubscribedAt" TIMESTAMP(3),
ADD COLUMN     "syncToken" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "syncErrorAt" TIMESTAMP(3),
ADD COLUMN     "syncErrorCount" INTEGER DEFAULT 0;

CREATE TABLE "CalendarCacheEvent" (
    "id" TEXT NOT NULL,
    "selectedCalendarId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalEtag" TEXT NOT NULL,
    "iCalUID" TEXT,
    "iCalSequence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT,
    "status" "CalendarCacheEventStatus" NOT NULL DEFAULT 'confirmed',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarCacheEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCacheEvent_selectedCalendarId_externalId_key" ON "CalendarCacheEvent"("selectedCalendarId", "externalId");

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_start_end_status_idx" ON "CalendarCacheEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_selectedCalendarId_iCalUID_idx" ON "CalendarCacheEvent"("selectedCalendarId", "iCalUID");

-- AddForeignKey
ALTER TABLE "CalendarCacheEvent" ADD CONSTRAINT "CalendarCacheEvent_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
