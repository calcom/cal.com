/*
  Warnings:

  - Added the required column `updatedAt` to the `CalendarCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add the column with a default value to safely handle existing rows
ALTER TABLE "CalendarCache" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
