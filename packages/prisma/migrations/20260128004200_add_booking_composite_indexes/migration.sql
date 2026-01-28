-- CreateIndex
CREATE INDEX "Attendee_email_bookingId_idx" ON "Attendee"("email", "bookingId");

-- CreateIndex
CREATE INDEX "Booking_userId_endTime_idx" ON "Booking"("userId", "endTime");

-- CreateIndex
CREATE INDEX "Booking_userId_status_startTime_idx" ON "Booking"("userId", "status", "startTime");

-- CreateIndex
CREATE INDEX "Booking_eventTypeId_status_idx" ON "Booking"("eventTypeId", "status");

-- CreateIndex
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");
