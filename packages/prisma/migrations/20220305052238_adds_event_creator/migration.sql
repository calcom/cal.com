-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "creatorId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;