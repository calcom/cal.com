/*
  Warnings:

  - Made the column `startTime` on table `Booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `endTime` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "startTime" SET NOT NULL,
ALTER COLUMN "endTime" SET NOT NULL;
