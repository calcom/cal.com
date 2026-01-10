-- DropIndex
DROP INDEX IF EXISTS "Watchlist_organizationId_isGlobal_idx";

-- DropIndex
DROP INDEX IF EXISTS "Watchlist_source_idx";

-- DropIndex
DROP INDEX IF EXISTS "WatchlistAudit_id_key";

-- DropIndex
DROP INDEX IF EXISTS "WatchlistEventAudit_eventTypeId_timestamp_idx";

-- DropIndex
DROP INDEX IF EXISTS "WatchlistEventAudit_watchlistId_timestamp_idx";
