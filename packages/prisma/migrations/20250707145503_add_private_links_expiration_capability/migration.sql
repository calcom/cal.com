-- AlterTable
ALTER TABLE "HashedLink" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "maxUsageCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "HashedLink_eventTypeId_idx" ON "HashedLink"("eventTypeId");
