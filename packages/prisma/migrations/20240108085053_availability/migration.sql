-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "ownedByOrganizationId" INTEGER;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_ownedByOrganizationId_fkey" FOREIGN KEY ("ownedByOrganizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
