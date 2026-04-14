-- Add index on Webhook.eventTypeId for FK cascade performance.
-- When deleting EventType rows, PostgreSQL checks Webhook_eventTypeId_fkey for
-- each deleted row. Without this index it seq-scans the Webhook table per row,
-- causing org member removal to time out on large orgs (~18s of the ~21s total).
--
-- Note: Uses regular CREATE INDEX (not CONCURRENTLY) for Prisma migration
-- compatibility. For large production databases, run manually with CONCURRENTLY
-- before deploying — the IF NOT EXISTS clause makes this migration a no-op.
CREATE INDEX IF NOT EXISTS "Webhook_eventTypeId_idx" ON "Webhook"("eventTypeId");
