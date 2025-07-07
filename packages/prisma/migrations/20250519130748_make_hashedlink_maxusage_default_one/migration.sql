/*
  Warnings:

  - Made the column `maxUsageCount` on table `HashedLink` required. This step will fail if there are existing NULL values in that column.

*/

-- AlterTable
ALTER TABLE "HashedLink" ALTER COLUMN "maxUsageCount" SET NOT NULL,
ALTER COLUMN "maxUsageCount" SET DEFAULT 1;

-- CreateIndex
CREATE INDEX "HashedLink_eventTypeId_idx" ON "HashedLink"("eventTypeId");