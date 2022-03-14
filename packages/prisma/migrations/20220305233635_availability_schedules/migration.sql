/*
  Warnings:

  - You are about to drop the column `label` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `freeBusyTimes` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Schedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventTypeId]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Schedule` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "label",
ADD COLUMN     "scheduleId" INTEGER;

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "freeBusyTimes",
DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "timeZone" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultScheduleId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_eventTypeId_key" ON "Schedule"("eventTypeId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
