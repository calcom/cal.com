-- AlterTable
ALTER TABLE "EventType" ADD COLUMN "optionalTeamGuestIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
