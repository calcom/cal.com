-- DropForeignKey
ALTER TABLE "InstantMeetingToken" DROP CONSTRAINT "InstantMeetingToken_teamId_fkey";

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
