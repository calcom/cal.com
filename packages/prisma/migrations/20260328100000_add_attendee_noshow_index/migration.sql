-- Partial index for Attendee no-show lookups.
-- The guest_stats CTE in getBookingStats/getEventTrendsStats joins Attendee
-- filtered by noShow = true. Without this index, PostgreSQL does a Parallel
-- Seq Scan on the entire Attendee table (~15M rows). With it, it does a
-- Parallel Index Only Scan on ~300K rows (only the no-shows).
--
-- Note: Uses regular CREATE INDEX (not CONCURRENTLY) for Prisma migration
-- compatibility. For large production databases, run manually with CONCURRENTLY
-- before deploying — the IF NOT EXISTS clause makes this migration a no-op.
CREATE INDEX IF NOT EXISTS "Attendee_bookingId_noShow_partial_idx"
  ON "Attendee" ("bookingId") WHERE "noShow" = true;
