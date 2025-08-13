-- CreateIndex
CREATE INDEX CONCURRENTLY "Booking_fromReschedule_idx" ON "Booking"("fromReschedule") WHERE "fromReschedule" IS NOT NULL;