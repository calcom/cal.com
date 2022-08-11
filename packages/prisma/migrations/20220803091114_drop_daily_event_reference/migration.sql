/*
  Warnings:

  - You are about to drop the `DailyEventReference` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyEventReference" DROP CONSTRAINT "DailyEventReference_bookingId_fkey";

-- DropTable
DROP TABLE "DailyEventReference";
