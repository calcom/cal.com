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
CREATE TABLE "BlockedBookingLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "eventTypeId" INTEGER,
    "organizationId" INTEGER,
    "bookingData" JSONB,
    "watchlistId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedBookingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockedBookingLog_organizationId_createdAt_idx" ON "BlockedBookingLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "BlockedBookingLog_email_idx" ON "BlockedBookingLog"("email");

-- CreateIndex
CREATE INDEX "BlockedBookingLog_watchlistId_idx" ON "BlockedBookingLog"("watchlistId");

-- CreateIndex
CREATE INDEX "Watchlist_type_value_organizationId_action_idx" ON "Watchlist"("type", "value", "organizationId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_type_value_organizationId_key" ON "Watchlist"("type","value","organizationId");

-- CreateIndex
-- Enforce uniqueness for global entries (organizationId IS NULL)
CREATE UNIQUE INDEX "Watchlist_type_value_global_key"
  ON "Watchlist"("type","value")
  WHERE "organizationId" IS NULL;
