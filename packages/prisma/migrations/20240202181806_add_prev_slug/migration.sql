/*
  Warnings:

  - A unique constraint covering the columns `[userId,previousSlug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teamId,previousSlug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "previousSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EventType_userId_previousSlug_key" ON "EventType"("userId", "previousSlug");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_teamId_previousSlug_key" ON "EventType"("teamId", "previousSlug");
