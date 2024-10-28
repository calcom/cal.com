-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "assignTeamMembersInSegment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membersAssignmentSegmentQueryValue" JSONB;
