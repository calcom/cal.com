/*
  Warnings:

  - You are about to drop the column `label` on the `Availability` table. All the data in the column will be lost.
  - You are about to drop the column `freeBusyTimes` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Schedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[eventTypeId]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Schedule` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "label",
ADD COLUMN     "scheduleId" INTEGER;

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "freeBusyTimes",
DROP COLUMN "title",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "timeZone" TEXT,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "defaultScheduleId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_eventTypeId_key" ON "Schedule"("eventTypeId");

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
