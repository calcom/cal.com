/*
  Warnings:

  - Made the column `eventId` on table `Payments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payments" ALTER COLUMN "eventId" SET NOT NULL;
