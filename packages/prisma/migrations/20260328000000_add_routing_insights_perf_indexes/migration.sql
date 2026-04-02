-- ============================================================================
-- Add composite indexes for /insights/routing query performance
-- ============================================================================
--
-- Note: These use regular CREATE/DROP INDEX (not CONCURRENTLY) because Prisma
-- runs migrations inside a transaction. For large production databases, you can
-- run the CREATE INDEX CONCURRENTLY statements manually before deploying —
-- the IF NOT EXISTS clause makes this migration a no-op for already-created indexes.

-- Composite index for routing insights queries that filter by formTeamId + createdAt.
-- Enables faster COUNT and stats queries on /insights/routing.
CREATE INDEX IF NOT EXISTS "RoutingFormResponseDenormalized_formTeamId_createdAt_idx"
  ON "RoutingFormResponseDenormalized" ("formTeamId", "createdAt");

-- Triple composite index covering formTeamId + formId + createdAt.
-- Enables Index Only Scan for pagination COUNT queries (no table access needed).
CREATE INDEX IF NOT EXISTS "RoutingFormResponseDenormalized_formTeamId_formId_createdAt_idx"
  ON "RoutingFormResponseDenormalized" ("formTeamId", "formId", "createdAt");

-- Composite index for user-scoped routing queries that filter by formUserId + createdAt.
CREATE INDEX IF NOT EXISTS "RoutingFormResponseDenormalized_formUserId_createdAt_idx"
  ON "RoutingFormResponseDenormalized" ("formUserId", "createdAt");

-- Composite index for routedToPerPeriod queries that filter by bookingUserId + createdAt.
CREATE INDEX IF NOT EXISTS "RoutingFormResponseDenormalized_bookingUserId_createdAt_idx"
  ON "RoutingFormResponseDenormalized" ("bookingUserId", "createdAt");

-- Composite index for field filter EXISTS subqueries.
-- Speeds up queries that filter routing responses by form field values.
CREATE INDEX IF NOT EXISTS "RoutingFormResponseField_responseId_fieldId_idx"
  ON "RoutingFormResponseField" ("responseId", "fieldId");

-- ============================================================================
-- Drop indexes that are now redundant
-- ============================================================================
-- A btree index on (A, B) can serve any query that only filters on (A),
-- because A is the leftmost prefix. The single-column indexes below are
-- therefore fully covered by the composite indexes above (or by pre-existing
-- composite indexes).

-- formTeamId_idx is a prefix of both:
--   formTeamId_createdAt_idx (added above)
--   formTeamId_formId_createdAt_idx (added above)
-- Any query doing WHERE formTeamId = X will use either composite index.
DROP INDEX IF EXISTS "RoutingFormResponseDenormalized_formTeamId_idx";

-- formId_idx is a prefix of the pre-existing formId_createdAt_idx.
-- Any query doing WHERE formId = X will use formId_createdAt_idx.
DROP INDEX IF EXISTS "RoutingFormResponseDenormalized_formId_idx";

-- formUserId_idx is a prefix of formUserId_createdAt_idx (added above).
-- Any query doing WHERE formUserId = X will use formUserId_createdAt_idx.
DROP INDEX IF EXISTS "RoutingFormResponseDenormalized_formUserId_idx";

-- bookingUserId_idx is a prefix of bookingUserId_createdAt_idx (added above).
-- Any query doing WHERE bookingUserId = X will use bookingUserId_createdAt_idx.
DROP INDEX IF EXISTS "RoutingFormResponseDenormalized_bookingUserId_idx";

-- responseId_idx is a prefix of responseId_fieldId_idx (added above).
-- Any query doing WHERE responseId = X will use responseId_fieldId_idx.
-- This includes the "fields" subquery in getTableData which filters on
-- responseId alone — the composite index serves it via leftmost prefix.
DROP INDEX IF EXISTS "RoutingFormResponseField_responseId_idx";
