-- CreateTable
CREATE TABLE "ExternalCalendarEventTombstone" (
    "id" SERIAL NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "iCalUID" TEXT,
    "recurringEventId" TEXT,
    "originalStartTime" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarEventTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalCalendarEventTombstone_calendarId_idx" ON "ExternalCalendarEventTombstone"("calendarId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEventTombstone_expiresAt_idx" ON "ExternalCalendarEventTombstone"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarEventTombstone_calendarId_externalEventId_key" ON "ExternalCalendarEventTombstone"("calendarId", "externalEventId");

-- AddForeignKey
ALTER TABLE "ExternalCalendarEventTombstone" ADD CONSTRAINT "ExternalCalendarEventTombstone_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ExternalCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
