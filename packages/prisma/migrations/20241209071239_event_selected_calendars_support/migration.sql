-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "useEventLevelSelectedCalendars" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "eventTypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
