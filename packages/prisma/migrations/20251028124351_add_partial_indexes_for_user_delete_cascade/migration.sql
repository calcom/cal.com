CREATE INDEX "Booking_reassignById_idx" ON "Booking"("reassignById")
WHERE "reassignById" IS NOT NULL;

CREATE INDEX "EventType_instantMeetingScheduleId_idx" ON "EventType"("instantMeetingScheduleId")
WHERE "instantMeetingScheduleId" IS NOT NULL;

CREATE INDEX "CreditExpenseLog_bookingUid_idx" ON "CreditExpenseLog"("bookingUid")
WHERE "bookingUid" IS NOT NULL;

CREATE INDEX "WebhookScheduledTriggers_bookingId_idx" ON "WebhookScheduledTriggers"("bookingId")
WHERE "bookingId" IS NOT NULL;