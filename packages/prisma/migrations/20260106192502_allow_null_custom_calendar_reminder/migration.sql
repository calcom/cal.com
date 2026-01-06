-- AlterTable
-- Change customCalendarReminder from NOT NULL with default to nullable
ALTER TABLE "public"."DestinationCalendar" ALTER COLUMN "customCalendarReminder" DROP NOT NULL;
ALTER TABLE "public"."DestinationCalendar" ALTER COLUMN "customCalendarReminder" DROP DEFAULT;
