-- AlterTable
ALTER TABLE "CalVideoSettings" ADD COLUMN     "disableTranscriptionForGuests" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disableTranscriptionForOrganizer" BOOLEAN NOT NULL DEFAULT false;
