-- Partial composite index for recurring booking groupBy queries on the bookings list page.
-- Replaces a full userId index scan + heap filter (530ms for 0 results) with a direct index lookup.
CREATE INDEX IF NOT EXISTS "Booking_userId_recurringEventId_partial_idx" ON "Booking" ("userId", "recurringEventId") WHERE "recurringEventId" IS NOT NULL;
