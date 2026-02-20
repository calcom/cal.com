-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalendarCacheEvent_selectedCalendarId_start_end_idx" ON "CalendarCacheEvent"("selectedCalendarId", "start", "end");
