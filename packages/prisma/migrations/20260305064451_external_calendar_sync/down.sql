-- DropForeignKey
ALTER TABLE "ExternalCalendar" DROP CONSTRAINT "ExternalCalendar_credentialId_fkey";

-- DropForeignKey
ALTER TABLE "ExternalCalendarSyncCursor" DROP CONSTRAINT "ExternalCalendarSyncCursor_calendarId_fkey";

-- DropForeignKey
ALTER TABLE "ExternalCalendarSubscription" DROP CONSTRAINT "ExternalCalendarSubscription_calendarId_fkey";

-- DropForeignKey
ALTER TABLE "ExternalCalendarEvent" DROP CONSTRAINT "ExternalCalendarEvent_calendarId_fkey";

-- DropTable
DROP TABLE "ExternalCalendar";

-- DropTable
DROP TABLE "ExternalCalendarSyncCursor";

-- DropTable
DROP TABLE "ExternalCalendarSubscription";

-- DropTable
DROP TABLE "ExternalCalendarEvent";

-- DropEnum
DROP TYPE "CalendarProvider";

-- DropEnum
DROP TYPE "CalendarSyncStatus";

-- DropEnum
DROP TYPE "CalendarCursorType";

