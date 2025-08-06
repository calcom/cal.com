/*
  Warnings:

  - A unique constraint covering the columns `[outlookSubscriptionId,eventTypeId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "outlookSubscriptionExpiration" TEXT,
ADD COLUMN     "outlookSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_outlookSubscriptionId_eventTypeId_key" ON "SelectedCalendar"("outlookSubscriptionId", "eventTypeId");
