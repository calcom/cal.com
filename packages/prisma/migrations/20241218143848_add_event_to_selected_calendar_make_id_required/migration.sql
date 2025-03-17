/*
  Warnings:

  - The primary key for the `SelectedCalendar` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,integration,externalId,eventTypeId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleChannelId,eventTypeId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.
  - Made the column `id` on table `SelectedCalendar` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "SelectedCalendar_googleChannelId_key";

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "useEventLevelSelectedCalendars" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_pkey",
ADD COLUMN     "eventTypeId" INTEGER,
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "SelectedCalendar_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "SelectedCalendar_eventTypeId_idx" ON "SelectedCalendar"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_userId_integration_externalId_eventTypeId_key" ON "SelectedCalendar"("userId", "integration", "externalId", "eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_googleChannelId_eventTypeId_key" ON "SelectedCalendar"("googleChannelId", "eventTypeId");

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
