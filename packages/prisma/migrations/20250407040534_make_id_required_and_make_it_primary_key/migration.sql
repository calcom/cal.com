/*
  Warnings:

  - The primary key for the `CalendarCache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `id` on table `CalendarCache` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CalendarCache" DROP CONSTRAINT "CalendarCache_pkey",
ALTER COLUMN "id" SET NOT NULL,
ADD CONSTRAINT "CalendarCache_pkey" PRIMARY KEY ("id");
