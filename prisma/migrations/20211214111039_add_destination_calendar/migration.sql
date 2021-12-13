-- AlterTable
ALTER TABLE "users" ALTER COLUMN "timeZone" SET DEFAULT E'America/Los_Angeles';

-- RenameIndex
ALTER INDEX "DestinationCalendar.bookingId_unique" RENAME TO "DestinationCalendar_bookingId_key";

-- RenameIndex
ALTER INDEX "DestinationCalendar.eventTypeId_unique" RENAME TO "DestinationCalendar_eventTypeId_key";

-- RenameIndex
ALTER INDEX "DestinationCalendar.userId_unique" RENAME TO "DestinationCalendar_userId_key";
