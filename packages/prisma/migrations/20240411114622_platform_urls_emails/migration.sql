-- AlterTable
ALTER TABLE "PlatformOAuthClient" ADD COLUMN     "areEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bookingCancelRedirectUri" TEXT,
ADD COLUMN     "bookingRedirectUri" TEXT,
ADD COLUMN     "bookingRescheduleRedirectUri" TEXT;
