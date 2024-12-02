-- DropForeignKey
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT "SelectedCalendar_eventTypeId_fkey";

-- DropIndex
DROP INDEX "SelectedCalendar_eventTypeId_idx";

-- DropIndex
DROP INDEX "SelectedCalendar_userId_integration_externalId_eventTypeId_key";

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "useEventLevelSelectedCalendars" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD CONSTRAINT "SelectedCalendar_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
