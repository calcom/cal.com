-- CreateEnum
CREATE TYPE "EventTypeStatus" AS ENUM ('ACTIVE', 'PAUSED', 'LEFT');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "status" "EventTypeStatus" NOT NULL DEFAULT E'ACTIVE';

-- AlterIndex
ALTER INDEX "Booking_uid_key" RENAME TO "Booking.uid_unique";

-- AlterIndex
ALTER INDEX "VerificationRequest_identifier_token_key" RENAME TO "VerificationRequest.identifier_token_unique";

-- AlterIndex
ALTER INDEX "VerificationRequest_token_key" RENAME TO "VerificationRequest.token_unique";

-- AlterIndex
ALTER INDEX "users_email_key" RENAME TO "users.email_unique";
