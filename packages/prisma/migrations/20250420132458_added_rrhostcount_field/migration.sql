/*
  Warnings:

  - Made the column `roundRobinHostsCount` on table `EventType` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "roundRobinHostsCount" SET NOT NULL;
