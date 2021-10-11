/*
  Warnings:

  - The `periodType` column on the `EventType` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `weekStart` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `completedOnboarding` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('unlimited', 'rolling', 'range');

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "periodType",
ADD COLUMN     "periodType" "PeriodType" NOT NULL DEFAULT E'unlimited';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "weekStart" SET NOT NULL,
ALTER COLUMN "completedOnboarding" SET NOT NULL;
