-- DropForeignKey
ALTER TABLE "InstantMeetingToken" DROP CONSTRAINT "InstantMeetingToken_teamId_fkey";

-- AlterTable
ALTER TABLE "InstantMeetingToken" ALTER COLUMN "teamId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InternalNotePreset" ADD COLUMN     "calIdTeamId" INTEGER;

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalNotePreset" ADD CONSTRAINT "InternalNotePreset_calIdTeamId_fkey" FOREIGN KEY ("calIdTeamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
