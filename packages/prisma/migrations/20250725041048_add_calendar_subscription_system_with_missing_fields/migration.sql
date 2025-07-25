-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "selectedCalendarId" TEXT NOT NULL,
    "googleChannelId" TEXT,
    "googleChannelKind" TEXT,
    "googleChannelResourceId" TEXT,
    "googleChannelResourceUri" TEXT,
    "googleChannelExpiration" TEXT,
    "nextSyncToken" TEXT,
    "lastFullSync" TIMESTAMP(3),
    "syncErrors" INTEGER NOT NULL DEFAULT 0,
    "maxSyncErrors" INTEGER NOT NULL DEFAULT 5,
    "backoffUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "calendarSubscriptionId" TEXT NOT NULL,
    "googleEventId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "etag" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "transparency" TEXT NOT NULL DEFAULT 'opaque',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleCreatedAt" TIMESTAMP(3),
    "googleUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_selectedCalendarId_key" ON "CalendarSubscription"("selectedCalendarId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_googleChannelExpiration_syncErrors_bac_idx" ON "CalendarSubscription"("googleChannelExpiration", "syncErrors", "backoffUntil");

-- CreateIndex
CREATE INDEX "CalendarSubscription_nextSyncToken_idx" ON "CalendarSubscription"("nextSyncToken");

-- CreateIndex
CREATE INDEX "CalendarSubscription_selectedCalendarId_idx" ON "CalendarSubscription"("selectedCalendarId");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_start_end_idx" ON "CalendarEvent"("calendarSubscriptionId", "start", "end");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_iCalUID_idx" ON "CalendarEvent"("calendarSubscriptionId", "iCalUID");

-- CreateIndex
CREATE INDEX "CalendarEvent_updatedAt_calendarSubscriptionId_idx" ON "CalendarEvent"("updatedAt", "calendarSubscriptionId");

-- CreateIndex
CREATE INDEX "CalendarEvent_start_end_status_idx" ON "CalendarEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarEvent_googleEventId_idx" ON "CalendarEvent"("googleEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarSubscriptionId_googleEventId_key" ON "CalendarEvent"("calendarSubscriptionId", "googleEventId");

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_calendarSubscriptionId_fkey" FOREIGN KEY ("calendarSubscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
