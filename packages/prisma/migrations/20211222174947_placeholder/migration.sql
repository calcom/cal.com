-- RenameIndex
ALTER INDEX "Booking_uid_key" RENAME TO "Booking.uid_unique";

-- RenameIndex
ALTER INDEX "DestinationCalendar_bookingId_key" RENAME TO "DestinationCalendar.bookingId_unique";

-- RenameIndex
ALTER INDEX "DestinationCalendar_eventTypeId_key" RENAME TO "DestinationCalendar.eventTypeId_unique";

-- RenameIndex
ALTER INDEX "DestinationCalendar_userId_key" RENAME TO "DestinationCalendar.userId_unique";

-- RenameIndex
ALTER INDEX "EventType_userId_slug_key" RENAME TO "EventType.userId_slug_unique";

-- RenameIndex
ALTER INDEX "Payment_externalId_key" RENAME TO "Payment.externalId_unique";

-- RenameIndex
ALTER INDEX "Payment_uid_key" RENAME TO "Payment.uid_unique";

-- RenameIndex
ALTER INDEX "Team_slug_key" RENAME TO "Team.slug_unique";

-- RenameIndex
ALTER INDEX "VerificationRequest_identifier_token_key" RENAME TO "VerificationRequest.identifier_token_unique";

-- RenameIndex
ALTER INDEX "VerificationRequest_token_key" RENAME TO "VerificationRequest.token_unique";

-- RenameIndex
ALTER INDEX "Webhook_id_key" RENAME TO "Webhook.id_unique";

-- RenameIndex
ALTER INDEX "users_email_key" RENAME TO "users.email_unique";

-- RenameIndex
ALTER INDEX "users_username_key" RENAME TO "users.username_unique";
