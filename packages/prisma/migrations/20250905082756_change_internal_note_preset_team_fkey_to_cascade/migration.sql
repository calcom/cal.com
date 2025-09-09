-- DropForeignKey
ALTER TABLE "InternalNotePreset" DROP CONSTRAINT "InternalNotePreset_teamId_fkey";

-- AddForeignKey
ALTER TABLE "InternalNotePreset" ADD CONSTRAINT "InternalNotePreset_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
