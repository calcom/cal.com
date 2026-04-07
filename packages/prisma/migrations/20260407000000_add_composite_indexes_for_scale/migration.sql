-- User: optimize login/verification lookups.
-- The User table has low write volume (account creation/updates) relative to
-- the high read frequency of auth queries, making this a safe addition.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_email_emailVerified_idx"
ON "users" ("email", "emailVerified");

-- Availability: optimize schedule-based date range lookups.
-- Availability has 3 existing indexes. This composite covers the common
-- query pattern of fetching schedule slots within a date range.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Availability_scheduleId_date_idx"
ON "Availability" ("scheduleId", "date");

-- Availability: optimize user-based date range lookups.
-- Covers the common pattern of fetching a user's availability for a date range.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Availability_userId_date_idx"
ON "Availability" ("userId", "date");
