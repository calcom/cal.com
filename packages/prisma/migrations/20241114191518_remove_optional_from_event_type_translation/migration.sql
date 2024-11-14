/*
  Warnings:

  - Made the column `createdBy` on table `EventTypeTranslation` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updatedBy` on table `EventTypeTranslation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventTypeTranslation" ALTER COLUMN "createdBy" SET NOT NULL,
ALTER COLUMN "updatedBy" SET NOT NULL;
