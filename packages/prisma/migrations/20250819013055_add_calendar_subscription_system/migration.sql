-- CreateTable
CREATE TABLE "CalendarSubscription" (
    "id" TEXT NOT NULL,
    "selectedCalendarId" TEXT NOT NULL,
    "channelId" TEXT,
    "channelKind" TEXT,
    "channelResourceId" TEXT,
    "channelResourceUri" TEXT,
    "channelResource" TEXT,
    "clientState" TEXT,
    "channelExpiration" TIMESTAMP(3),
    "syncCursor" TEXT,
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
    "externalEventId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "externalEtag" TEXT NOT NULL,
    "iCalSequence" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "description" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "timeZone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "transparency" TEXT NOT NULL DEFAULT 'opaque',
    "visibility" TEXT NOT NULL DEFAULT 'default',
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalCreatedAt" TIMESTAMP(3),
    "externalUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSubscription_selectedCalendarId_key" ON "CalendarSubscription"("selectedCalendarId");

-- CreateIndex
CREATE INDEX "CalendarSubscription_channelExpiration_syncErrors_backoffUn_idx" ON "CalendarSubscription"("channelExpiration", "syncErrors", "backoffUntil");

-- CreateIndex
CREATE INDEX "CalendarSubscription_syncCursor_idx" ON "CalendarSubscription"("syncCursor");

-- CreateIndex
CREATE INDEX "CalendarSubscription_selectedCalendarId_idx" ON "CalendarSubscription"("selectedCalendarId");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_start_end_idx" ON "CalendarEvent"("calendarSubscriptionId", "start", "end");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarSubscriptionId_iCalUID_idx" ON "CalendarEvent"("calendarSubscriptionId", "iCalUID");

-- CreateIndex
CREATE INDEX "CalendarEvent_start_end_status_idx" ON "CalendarEvent"("start", "end", "status");

-- CreateIndex
CREATE INDEX "CalendarEvent_externalEventId_idx" ON "CalendarEvent"("externalEventId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_calendarSubscriptionId_externalEventId_key" ON "CalendarEvent"("calendarSubscriptionId", "externalEventId");

-- AddForeignKey
ALTER TABLE "CalendarSubscription" ADD CONSTRAINT "CalendarSubscription_selectedCalendarId_fkey" FOREIGN KEY ("selectedCalendarId") REFERENCES "SelectedCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_calendarSubscriptionId_fkey" FOREIGN KEY ("calendarSubscriptionId") REFERENCES "CalendarSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
