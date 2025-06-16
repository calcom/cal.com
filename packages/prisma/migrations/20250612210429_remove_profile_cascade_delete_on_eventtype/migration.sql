-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_profileId_fkey";

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
