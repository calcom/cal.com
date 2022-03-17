-- CreateEnum
CREATE TYPE "EventTypeAttendeeReminderMethod" AS ENUM ('SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "EventTypeAttendeeReminderUnitTime" AS ENUM ('day', 'hour', 'minute');

-- CreateTable
CREATE TABLE "EventTypeAttendeeReminder" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "method" "EventTypeAttendeeReminderMethod" NOT NULL,
    "time" INTEGER NOT NULL,
    "unitTime" "EventTypeAttendeeReminderUnitTime" NOT NULL,

    CONSTRAINT "EventTypeAttendeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendeeReminder" (
    "id" SERIAL NOT NULL,
    "bookingUid" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sendTo" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduled" BOOLEAN NOT NULL,

    CONSTRAINT "AttendeeReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendeeReminder_referenceId_key" ON "AttendeeReminder"("referenceId");

-- AddForeignKey
ALTER TABLE "EventTypeAttendeeReminder" ADD CONSTRAINT "EventTypeAttendeeReminder_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendeeReminder" ADD CONSTRAINT "AttendeeReminder_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER INDEX "VerificationRequest.identifier_token_unique" RENAME TO "VerificationRequest_identifier_token_key";

-- RenameIndex
ALTER INDEX "VerificationRequest.token_unique" RENAME TO "VerificationRequest_token_key";

-- RenameIndex
ALTER INDEX "Webhook.id_unique" RENAME TO "Webhook_id_key";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";

-- RenameIndex
ALTER INDEX "users.username_unique" RENAME TO "users_username_key";
