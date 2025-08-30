-- RenameIndex
ALTER INDEX "Booking.uid_unique" RENAME TO "Booking_uid_key";

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference_bookingId_key";

-- RenameIndex
ALTER INDEX "DestinationCalendar.bookingId_unique" RENAME TO "DestinationCalendar_bookingId_key";

-- RenameIndex
ALTER INDEX "DestinationCalendar.eventTypeId_unique" RENAME TO "DestinationCalendar_eventTypeId_key";

-- RenameIndex
ALTER INDEX "DestinationCalendar.userId_unique" RENAME TO "DestinationCalendar_userId_key";

-- RenameIndex
ALTER INDEX "EventType.userId_slug_unique" RENAME TO "EventType_userId_slug_key";

-- RenameIndex
ALTER INDEX "Payment.externalId_unique" RENAME TO "Payment_externalId_key";

-- RenameIndex
ALTER INDEX "Payment.uid_unique" RENAME TO "Payment_uid_key";

-- RenameIndex
ALTER INDEX "Team.slug_unique" RENAME TO "Team_slug_key";

-- RenameIndex
ALTER INDEX "Webhook.id_unique" RENAME TO "Webhook_id_key";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "users.username_unique" RENAME TO "users_username_key";
