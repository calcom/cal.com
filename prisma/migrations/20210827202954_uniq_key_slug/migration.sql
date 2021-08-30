/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EventType.slug_unique" ON "EventType"("slug");
