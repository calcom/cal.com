/*
  Warnings:

  - You are about to drop the `BookingReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "WatchlistType" ADD VALUE 'BOOKING_REPORT';

-- DropForeignKey
ALTER TABLE "BookingReport" DROP CONSTRAINT "BookingReport_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "BookingReport" DROP CONSTRAINT "BookingReport_reportedById_fkey";

-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_createdById_fkey";

-- DropTable
DROP TABLE "BookingReport";

-- CreateTable
CREATE TABLE "BookingReportLog" (
    "id" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "reportedById" INTEGER NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "watchlistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingReportLog_bookingId_key" ON "BookingReportLog"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReportLog_bookingId_idx" ON "BookingReportLog"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReportLog_reportedById_idx" ON "BookingReportLog"("reportedById");

-- CreateIndex
CREATE INDEX "BookingReportLog_watchlistId_idx" ON "BookingReportLog"("watchlistId");

-- AddForeignKey
ALTER TABLE "BookingReportLog" ADD CONSTRAINT "BookingReportLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReportLog" ADD CONSTRAINT "BookingReportLog_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReportLog" ADD CONSTRAINT "BookingReportLog_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
