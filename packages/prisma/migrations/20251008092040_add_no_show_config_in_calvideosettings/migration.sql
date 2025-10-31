-- AlterTable
ALTER TABLE "CalVideoSettings" ADD COLUMN     "enableAutomaticNoShowTrackingForGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableAutomaticNoShowTrackingForHosts" BOOLEAN NOT NULL DEFAULT false;
