/*
  Warnings:

  - A unique constraint covering the columns `[userId,slug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EventType.userId_slug_unique" ON "EventType"("userId", "slug");
