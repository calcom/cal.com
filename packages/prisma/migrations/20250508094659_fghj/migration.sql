/*
  Warnings:

  - You are about to drop the column `calendarEventId` on the `BookingReference` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BookingReference_calendarEventId_idx";

-- AlterTable
ALTER TABLE "BookingReference" DROP COLUMN "calendarEventId";
