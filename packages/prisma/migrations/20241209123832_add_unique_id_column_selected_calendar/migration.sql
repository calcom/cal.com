/*
  Warnings:

  - The primary key for the `SelectedCalendar` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,integration,externalId,eventTypeId]` on the table `SelectedCalendar` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "SelectedCalendar_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_userId_integration_externalId_eventTypeId_key" ON "SelectedCalendar"("userId", "integration", "externalId", "eventTypeId");
