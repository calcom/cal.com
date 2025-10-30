-- DropForeignKey
ALTER TABLE "InstantMeetingToken" DROP CONSTRAINT "InstantMeetingToken_teamId_fkey";

-- DropForeignKey
ALTER TABLE "InternalNotePreset" DROP CONSTRAINT "InternalNotePreset_calIdTeamId_fkey";

-- AlterTable
ALTER TABLE "InstantMeetingToken" ALTER COLUMN "teamId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InternalNotePreset" DROP COLUMN "calIdTeamId";

-- AddForeignKey
ALTER TABLE "InstantMeetingToken" ADD CONSTRAINT "InstantMeetingToken_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

