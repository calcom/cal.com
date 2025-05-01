-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "calendarEventId" TEXT;

-- CreateIndex
CREATE INDEX "BookingReference_calendarEventId_idx" ON "BookingReference"("calendarEventId");
