-- CreateEnum
CREATE TYPE "BookingReportReason" AS ENUM ('SPAM', 'dont_know_person', 'OTHER');

-- CreateTable
CREATE TABLE "BookingReport" (
    "id" UUID NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "bookerEmail" TEXT NOT NULL,
    "reportedById" INTEGER,
    "organizationId" INTEGER,
    "reason" "BookingReportReason" NOT NULL,
    "description" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "watchlistId" UUID,

    CONSTRAINT "BookingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingReport_bookingUid_key" ON "BookingReport"("bookingUid");

-- CreateIndex
CREATE INDEX "BookingReport_bookerEmail_idx" ON "BookingReport"("bookerEmail");

-- CreateIndex
CREATE INDEX "BookingReport_reportedById_idx" ON "BookingReport"("reportedById");

-- CreateIndex
CREATE INDEX "BookingReport_organizationId_idx" ON "BookingReport"("organizationId");

-- CreateIndex
CREATE INDEX "BookingReport_watchlistId_idx" ON "BookingReport"("watchlistId");

-- CreateIndex
CREATE INDEX "BookingReport_createdAt_idx" ON "BookingReport"("createdAt");

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
