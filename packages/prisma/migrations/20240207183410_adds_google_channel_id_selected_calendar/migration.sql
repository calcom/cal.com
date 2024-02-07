/*
  Warnings:

  - A unique constraint covering the columns `[googleChannelId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "googleChannelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_googleChannelId_key" ON "SelectedCalendar"("googleChannelId");
