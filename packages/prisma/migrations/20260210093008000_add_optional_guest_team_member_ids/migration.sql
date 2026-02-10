-- AlterTable
ALTER TABLE "EventType" ADD COLUMN "optionalGuestTeamMemberIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
