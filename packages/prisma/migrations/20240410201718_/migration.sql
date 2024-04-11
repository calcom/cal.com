-- AlterTable
ALTER TABLE "PlatformOAuthClient" ADD COLUMN     "bookingCancelRedirectUri" TEXT,
ADD COLUMN     "bookingRedirectUri" TEXT,
ADD COLUMN     "bookingRescheduleRedirectUri" TEXT;
