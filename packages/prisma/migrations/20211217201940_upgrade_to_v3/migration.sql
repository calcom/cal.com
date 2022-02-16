-- DropForeignKey
ALTER TABLE "EventTypeCustomInput" DROP CONSTRAINT "EventTypeCustomInput_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_userId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_userId_fkey";

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTypeCustomInput" ADD CONSTRAINT "EventTypeCustomInput_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Booking.uid_unique" RENAME TO "Booking_uid_key";

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
ALTER INDEX "VerificationRequest.identifier_token_unique" RENAME TO "VerificationRequest_identifier_token_key";

-- RenameIndex
ALTER INDEX "VerificationRequest.token_unique" RENAME TO "VerificationRequest_token_key";

-- RenameIndex
ALTER INDEX "Webhook.id_unique" RENAME TO "Webhook_id_key";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "users.username_unique" RENAME TO "users_username_key";
