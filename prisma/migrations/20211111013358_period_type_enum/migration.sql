/*
  Warnings:

  - The `periodType` column on the `EventType` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('unlimited', 'rolling', 'range');

-- AlterTable

ALTER TABLE "EventType" RENAME COLUMN "periodType" to "old_periodType";
ALTER TABLE "EventType" ADD COLUMN "periodType" "PeriodType" NOT NULL DEFAULT E'unlimited';

UPDATE "EventType" SET "periodType" = "old_periodType"::"PeriodType";
ALTER TABLE "EventType" DROP COLUMN "old_periodType";