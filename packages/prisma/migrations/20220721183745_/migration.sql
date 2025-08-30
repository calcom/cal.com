-- DropForeignKey
ALTER TABLE "DestinationCalendar" DROP CONSTRAINT "DestinationCalendar_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "DestinationCalendar" DROP CONSTRAINT "DestinationCalendar_userId_fkey";

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD CONSTRAINT "DestinationCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
