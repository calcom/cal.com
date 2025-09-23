/*
  Warnings:

  - A unique constraint covering the columns `[type,value,organizationId]` on the table `Watchlist` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "WatchlistAction" AS ENUM ('REPORT', 'BLOCK');

-- DropIndex
DROP INDEX "Watchlist_type_value_idx";

-- DropIndex
DROP INDEX "Watchlist_type_value_key";

-- AlterTable
ALTER TABLE "Watchlist" ADD COLUMN     "action" "WatchlistAction" NOT NULL DEFAULT 'REPORT',
ADD COLUMN     "organizationId" INTEGER;

-- CreateTable
CREATE TABLE "BlockedBooking" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "organizationId" INTEGER,
    "watchlistEntryId" TEXT,
    "bookingData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockedBooking_id_key" ON "BlockedBooking"("id");

-- CreateIndex
CREATE INDEX "BlockedBooking_organizationId_createdAt_idx" ON "BlockedBooking"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BlockedBooking_email_idx" ON "BlockedBooking"("email");

-- CreateIndex
CREATE INDEX "BlockedBooking_watchlistEntryId_idx" ON "BlockedBooking"("watchlistEntryId");

-- CreateIndex
CREATE INDEX "Watchlist_type_value_organizationId_action_idx" ON "Watchlist"("type", "value", "organizationId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_type_value_organizationId_key" ON "Watchlist"("type","value","organizationId");

-- CreateIndex
-- Enforce uniqueness for global entries (organizationId IS NULL)
CREATE UNIQUE INDEX "Watchlist_type_value_global_key"
  ON "Watchlist"("type","value")
  WHERE "organizationId" IS NULL;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedBooking" ADD CONSTRAINT "BlockedBooking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedBooking" ADD CONSTRAINT "BlockedBooking_watchlistEntryId_fkey" FOREIGN KEY ("watchlistEntryId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;