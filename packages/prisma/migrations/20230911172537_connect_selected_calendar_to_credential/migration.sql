-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "credentialId" INTEGER;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
