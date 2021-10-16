-- DropForeignKey
ALTER TABLE "Attendee" DROP CONSTRAINT "Attendee_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_userId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT "BookingReference_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_userId_fkey";

-- DropForeignKey
ALTER TABLE "DailyEventReference" DROP CONSTRAINT "DailyEventReference_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_teamId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_userId_fkey";

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReference" ADD CONSTRAINT "BookingReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyEventReference" ADD CONSTRAINT "DailyEventReference_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Booking.uid_unique" RENAME TO "Booking_uid_key";

-- RenameIndex
ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference_bookingId_key";

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
