-- DropForeignKey
ALTER TABLE "ExternalCalendarEventTombstone" DROP CONSTRAINT "ExternalCalendarEventTombstone_calendarId_fkey";

-- DropTable
DROP TABLE "ExternalCalendarEventTombstone";
