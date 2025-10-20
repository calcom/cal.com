-- AlterTable
ALTER TABLE "BookingDenormalized" ADD COLUMN     "assignmentReasons" TEXT,
ADD COLUMN     "fromReschedule" TEXT,
ADD COLUMN     "reroutedFromBookingUid" TEXT;

-- CreateIndex
CREATE INDEX "BookingDenormalized_fromReschedule_idx" ON "BookingDenormalized"("fromReschedule");

-- CreateIndex
CREATE INDEX "BookingDenormalized_reroutedFromBookingUid_idx" ON "BookingDenormalized"("reroutedFromBookingUid");
