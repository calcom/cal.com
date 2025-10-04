-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'dont_know_person', 'OTHER');

-- CreateTable
CREATE TABLE "BookingReport" (
    "id" TEXT NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "reportedById" INTEGER NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingReport_bookingId_key" ON "BookingReport"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReport_bookingId_idx" ON "BookingReport"("bookingId");

-- CreateIndex
CREATE INDEX "BookingReport_reportedById_idx" ON "BookingReport"("reportedById");

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
