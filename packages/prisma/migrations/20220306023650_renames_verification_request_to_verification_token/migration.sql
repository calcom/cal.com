/*
  Warnings:

  - You are about to drop the `VerificationRequest` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "VerificationRequest";

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- Should we instead of droping and creating rename the table (and indices if apply) if it exists instead?
-- ALTER TABLE IF EXISTS "VerificationRequest" RENAME TO "VerificationToken";
-- I think there's no need because we were'nt using the table anyway.

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");


-- I think this can be safely ignored from prisma migrate dev output
-- -- RenameIndex
-- ALTER INDEX "Booking.uid_unique" RENAME TO "Booking_uid_key";

-- -- RenameIndex
-- ALTER INDEX "DailyEventReference_bookingId_unique" RENAME TO "DailyEventReference_bookingId_key";

-- -- RenameIndex
-- ALTER INDEX "DestinationCalendar.bookingId_unique" RENAME TO "DestinationCalendar_bookingId_key";

-- -- RenameIndex
-- ALTER INDEX "DestinationCalendar.eventTypeId_unique" RENAME TO "DestinationCalendar_eventTypeId_key";

-- -- RenameIndex
-- ALTER INDEX "DestinationCalendar.userId_unique" RENAME TO "DestinationCalendar_userId_key";

-- -- RenameIndex
-- ALTER INDEX "EventType.userId_slug_unique" RENAME TO "EventType_userId_slug_key";

-- -- RenameIndex
-- ALTER INDEX "Payment.externalId_unique" RENAME TO "Payment_externalId_key";

-- -- RenameIndex
-- ALTER INDEX "Payment.uid_unique" RENAME TO "Payment_uid_key";

-- -- RenameIndex
-- ALTER INDEX "Team.slug_unique" RENAME TO "Team_slug_key";

-- -- RenameIndex
-- ALTER INDEX "Webhook.id_unique" RENAME TO "Webhook_id_key";

-- -- RenameIndex
-- ALTER INDEX "users.email_unique" RENAME TO "users_email_key";

-- -- RenameIndex
-- ALTER INDEX "users.username_unique" RENAME TO "users_username_key";
