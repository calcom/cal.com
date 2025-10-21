-- AlterTable
ALTER TABLE "BookingDenormalized" ADD COLUMN     "assignmentReasons" TEXT,
ADD COLUMN     "fromReschedule" TEXT;

-- CreateIndex
CREATE INDEX "BookingDenormalized_fromReschedule_idx" ON "BookingDenormalized"("fromReschedule");
