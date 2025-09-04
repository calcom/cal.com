-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "cacheEnabled" BOOLEAN,
ADD COLUMN     "channelExpiration" TIMESTAMP(3),
ADD COLUMN     "channelId" TEXT,
ADD COLUMN     "channelKind" TEXT,
ADD COLUMN     "channelResourceId" TEXT,
ADD COLUMN     "channelResourceUri" TEXT,
ADD COLUMN     "syncCursor" TEXT,
ADD COLUMN     "syncEnabled" BOOLEAN;

-- CreateTable
CREATE TABLE "CalendarCacheEvent" (
    "id" TEXT NOT NULL,
    "selectedCalendarId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
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
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarCacheEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_start_end_status_idx" ON "CalendarCacheEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarCacheEvent_selectedCalendarId_iCalUID_idx" ON "CalendarCacheEvent"("selectedCalendarId", "iCalUID");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCacheEvent_selectedCalendarId_externalEventId_key" ON "CalendarCacheEvent"("selectedCalendarId", "externalEventId");

-- AddForeignKey
ALTER TABLE "CalendarCacheEvent" ADD CONSTRAINT "CalendarCacheEvent_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
