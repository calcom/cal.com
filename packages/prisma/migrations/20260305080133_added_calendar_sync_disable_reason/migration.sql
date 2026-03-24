-- CreateEnum
CREATE TYPE "CalendarSyncDisabledReason" AS ENUM ('USER_DISCONNECTED', 'USER_TOGGLED_OFF', 'SUBSCRIPTION_RENEWAL_FAILED');

-- CreateEnum
CREATE TYPE "CalendarSyncDisabledBy" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "ExternalCalendar" ADD COLUMN     "syncDisabledAt" TIMESTAMP(3),
ADD COLUMN     "syncDisabledBy" "CalendarSyncDisabledBy",
ADD COLUMN     "syncDisabledReason" "CalendarSyncDisabledReason";
