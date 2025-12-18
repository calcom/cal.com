-- CreateEnum
CREATE TYPE "public"."SystemReportStatus" AS ENUM ('PENDING', 'BLOCKED', 'DISMISSED');

-- AlterTable
ALTER TABLE "public"."BookingReport" ADD COLUMN     "globalWatchlistId" UUID,
ADD COLUMN     "systemStatus" "public"."SystemReportStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "BookingReport_globalWatchlistId_idx" ON "public"."BookingReport"("globalWatchlistId");

-- CreateIndex
CREATE INDEX "BookingReport_systemStatus_idx" ON "public"."BookingReport"("systemStatus");

-- AddForeignKey
ALTER TABLE "public"."BookingReport" ADD CONSTRAINT "BookingReport_globalWatchlistId_fkey" FOREIGN KEY ("globalWatchlistId") REFERENCES "public"."Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
