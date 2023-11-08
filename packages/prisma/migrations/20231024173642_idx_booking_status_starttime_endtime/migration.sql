-- CreateIndex
CREATE INDEX "Booking_startTime_endTime_status_idx" ON "Booking"("startTime", "endTime", "status");
