-- AlterTable
ALTER TABLE "DestinationCalendar" ADD COLUMN     "profileId" INTEGER;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
