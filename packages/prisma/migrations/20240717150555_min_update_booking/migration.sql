/*
  Warnings:

  - You are about to drop the column `minimumCancelNotice` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `minimumRescheduleNotice` on the `EventType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "minimumCancelNotice",
DROP COLUMN "minimumRescheduleNotice",
ADD COLUMN     "minimumUpdateNotice" INTEGER NOT NULL DEFAULT 0;
