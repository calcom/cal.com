-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "profileId" INTEGER;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
