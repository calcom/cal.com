-- CreateIndex
CREATE INDEX "BookingDenormalized_startTime_endTime_idx" ON "BookingDenormalized"("startTime", "endTime");
