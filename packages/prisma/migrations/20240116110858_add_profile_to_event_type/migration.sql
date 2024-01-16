-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "profileId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
