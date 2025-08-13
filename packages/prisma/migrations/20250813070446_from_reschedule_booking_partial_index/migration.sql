-- CreateIndex
CREATE INDEX "booking_fromReschedule_idx" ON "Booking"("fromReschedule") WHERE "fromReschedule" IS NOT NULL;