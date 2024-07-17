-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "secondaryEmailId" INTEGER;

-- CreateIndex
CREATE INDEX "EventType_secondaryEmailId_idx" ON "EventType"("secondaryEmailId");

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_secondaryEmailId_fkey" FOREIGN KEY ("secondaryEmailId") REFERENCES "SecondaryEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
