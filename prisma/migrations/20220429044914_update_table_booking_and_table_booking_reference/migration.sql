-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('cancelled', 'accepted', 'rejected', 'pending');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "confirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dynamicEventSlugRef" TEXT,
ADD COLUMN     "dynamicGroupSlugRef" TEXT,
ADD COLUMN     "fromReschedule" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "rejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rescheduled" BOOLEAN,
ADD COLUMN     "status" "BookingStatus" NOT NULL DEFAULT E'accepted';

-- AlterTable
ALTER TABLE "BookingReference" ADD COLUMN     "deleted" BOOLEAN,
ADD COLUMN     "meetingId" TEXT,
ADD COLUMN     "meetingPassword" TEXT,
ADD COLUMN     "meetingUrl" TEXT;

-- RenameIndex
ALTER INDEX "Booking.uid_unique" RENAME TO "Booking_uid_key";

-- RenameIndex
ALTER INDEX "VerificationRequest.identifier_token_unique" RENAME TO "VerificationRequest_identifier_token_key";

-- RenameIndex
ALTER INDEX "VerificationRequest.token_unique" RENAME TO "VerificationRequest_token_key";

-- RenameIndex
ALTER INDEX "users.email_unique" RENAME TO "users_email_key";
