-- CreateEnum
CREATE TYPE "WatchlistSource" AS ENUM ('MANUAL', 'FREE_DOMAIN_POLICY');

-- AlterEnum
ALTER TYPE "WatchlistAction" ADD VALUE 'ALERT';

-- Create WatchlistAudit table BEFORE modifying Watchlist
-- CreateTable
CREATE TABLE "WatchlistAudit" (
    "id" TEXT NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "action" "WatchlistAction" NOT NULL DEFAULT 'REPORT',
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" INTEGER,
    "watchlistId" TEXT NOT NULL,

    CONSTRAINT "WatchlistAudit_pkey" PRIMARY KEY ("id")
);

-- Backfill WatchlistAudit with existing Watchlist data

INSERT INTO "WatchlistAudit" (
    "id",
    "type", 
    "value", 
    "description", 
    "action", 
    "changedAt", 
    "changedByUserId", 
    "watchlistId"
)
SELECT 
    gen_random_uuid() as "id",
    "type",
    "value",
    "description",
    "action",
    "createdAt" as "changedAt",
    "createdById" as "changedByUserId",
    "id" as "watchlistId"
FROM "Watchlist";

-- Now safely drop foreign key constraints
-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_updatedById_fkey";

-- Modify Watchlist table structure
-- AlterTable
ALTER TABLE "Watchlist" DROP COLUMN "createdAt",
DROP COLUMN "createdById",
DROP COLUMN "severity",
DROP COLUMN "updatedAt",
DROP COLUMN "updatedById",
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" "WatchlistSource" NOT NULL DEFAULT 'MANUAL';

-- Drop the BlockedBookingLog table
-- DropTable
DROP TABLE "BlockedBookingLog";

-- Drop unused enum
-- DropEnum
DROP TYPE "WatchlistSeverity";

-- Create WatchlistEventAudit table
-- CreateTable
CREATE TABLE "WatchlistEventAudit" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "actionTaken" "WatchlistAction" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistEventAudit_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
-- CreateIndex
CREATE UNIQUE INDEX "WatchlistAudit_id_key" ON "WatchlistAudit"("id");

-- CreateIndex
CREATE INDEX "WatchlistAudit_watchlistId_changedAt_idx" ON "WatchlistAudit"("watchlistId", "changedAt");
