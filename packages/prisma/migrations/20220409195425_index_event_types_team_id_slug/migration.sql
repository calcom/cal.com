/*
  Warnings:

  - A unique constraint covering the columns `[teamId,slug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EventType_teamId_slug_key" ON "EventType"("teamId", "slug");

