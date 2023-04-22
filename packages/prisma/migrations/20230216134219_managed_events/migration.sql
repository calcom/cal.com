/*
  Warnings:

  - A unique constraint covering the columns `[userId,parentId]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SchedulingType" ADD VALUE 'managed';

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "parentId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "EventType_userId_parentId_key" ON "EventType"("userId", "parentId");

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
