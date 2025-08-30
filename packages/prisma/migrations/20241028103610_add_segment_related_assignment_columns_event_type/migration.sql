-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "assignRRMembersUsingSegment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rrSegmentQueryValue" JSONB;
