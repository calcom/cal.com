/*
  Warnings:

  - Made the column `slug` on table `EventType` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "slug" SET DEFAULT '';
