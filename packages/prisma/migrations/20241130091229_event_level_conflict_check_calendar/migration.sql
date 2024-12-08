/*
  Warnings:

  - A unique constraint covering the columns `[userId,integration,externalId,eventTypeId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "eventTypeId" INTEGER;

-- CreateIndex
CREATE INDEX "SelectedCalendar_eventTypeId_idx" ON "SelectedCalendar"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_userId_integration_externalId_eventTypeId_key" ON "SelectedCalendar"("userId", "integration", "externalId", "eventTypeId");

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
