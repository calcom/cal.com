/*
  Warnings:

  - The `status` column on the `CalendarSubscription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `lastSyncDirection` column on the `CalendarSync` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CalendarSubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "CalendarSyncDirection" AS ENUM ('UPSTREAM', 'DOWNSTREAM');

-- AlterTable
ALTER TABLE "CalendarSubscription" DROP COLUMN "status",
ADD COLUMN     "status" "CalendarSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "CalendarSync" DROP COLUMN "lastSyncDirection",
ADD COLUMN     "lastSyncDirection" "CalendarSyncDirection";

-- DropEnum
DROP TYPE "Direction";

-- DropEnum
DROP TYPE "SubscriptionStatus";
