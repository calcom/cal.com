-- CreateEnum
CREATE TYPE "WatchlistSource" AS ENUM ('MANUAL', 'FREE_DOMAIN_POLICY');

-- AlterEnum
ALTER TYPE "WatchlistAction" ADD VALUE 'ALERT';


-- 1) Add a temporary UUID column `uid` and backfill it without extensions
ALTER TABLE "Watchlist"
  ADD COLUMN IF NOT EXISTS "uid" UUID;

-- Backfill existing rows with UUIDs using gen_random_uuid()
UPDATE "Watchlist"
SET "uid" = COALESCE("uid", gen_random_uuid());

-- Enforce NOT NULL now that all rows have a value
ALTER TABLE "Watchlist"
  ALTER COLUMN "uid" SET NOT NULL;

-- 2) Adjust uniques/indexes that reference old id? (none in your snippet)
--    If you had FKs or PK references elsewhere, you'd update them here.

-- 3) Switch primary key from old `id` to new `uid`:
--    Drop old PK (name might vary in your DB; adjust if needed)
DO $$ BEGIN
  ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_pkey";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 4) Drop the old `id` column and rename `uid`→`id`
ALTER TABLE "Watchlist" DROP COLUMN "id";
ALTER TABLE "Watchlist" RENAME COLUMN "uid" TO "id";

-- 5) Add the new PK on `id` (UUID)
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id");

-- DropForeignKey - Do this before modifying Watchlist structure
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_updatedById_fkey";

-- Modify Watchlist table structure FIRST
-- AlterTable
ALTER TABLE "Watchlist" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "severity",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedById",
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" "WatchlistSource" NOT NULL DEFAULT 'MANUAL';

-- Create WatchlistAudit table AFTER Watchlist has UUID id
-- CreateTable
CREATE TABLE "WatchlistAudit" (
    "id" UUID NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "action" "WatchlistAction" NOT NULL DEFAULT 'REPORT',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" INTEGER,
    "watchlistId" UUID NOT NULL,

    CONSTRAINT "WatchlistAudit_pkey" PRIMARY KEY ("id")
);

-- Drop the BlockedBookingLog table
-- DropTable
DROP TABLE "BlockedBookingLog";

-- Drop unused enum
-- DropEnum
DROP TYPE "WatchlistSeverity";

-- Create WatchlistEventAudit table
-- CreateTable
CREATE TABLE "WatchlistEventAudit" (
    "id" UUID NOT NULL,
    "watchlistId" UUID NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "actionTaken" "WatchlistAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistEventAudit_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WatchlistAudit_id_key" ON "WatchlistAudit"("id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WatchlistAudit_watchlistId_changedAt_idx" ON "WatchlistAudit"("watchlistId", "changedAt");

-- CreateIndex - Main composite index matching schema
CREATE INDEX IF NOT EXISTS "Watchlist_type_value_organizationId_action_idx" ON "Watchlist"("type", "value", "organizationId", "action");

-- CreateIndex - For organization-specific and global queries
CREATE INDEX IF NOT EXISTS "Watchlist_organizationId_isGlobal_idx" ON "Watchlist"("organizationId", "isGlobal");

-- CreateIndex - For source-based queries
CREATE INDEX IF NOT EXISTS "Watchlist_source_idx" ON "Watchlist"("source");

-- CreateIndex - Add unique constraint matching schema
CREATE UNIQUE INDEX IF NOT EXISTS "Watchlist_type_value_organizationId_key" ON "Watchlist"("type", "value", "organizationId");

-- CreateIndex - Performance index for WatchlistEventAudit queries
CREATE INDEX IF NOT EXISTS "WatchlistEventAudit_watchlistId_timestamp_idx" ON "WatchlistEventAudit"("watchlistId", "timestamp");

-- CreateIndex - For eventType-based queries
CREATE INDEX IF NOT EXISTS "WatchlistEventAudit_eventTypeId_timestamp_idx" ON "WatchlistEventAudit"("eventTypeId", "timestamp");
