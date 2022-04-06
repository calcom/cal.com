/*
  Warnings:

  - Made the column `periodType` on table `EventType` required. This step will fail if there are existing NULL values in that column.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weekStart` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `completedOnboarding` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "EventType" ALTER COLUMN "periodType" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "weekStart" SET NOT NULL,
ALTER COLUMN "completedOnboarding" SET NOT NULL;
