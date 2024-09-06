-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "instantMeetingScheduleId" INTEGER;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_instantMeetingScheduleId_fkey" FOREIGN KEY ("instantMeetingScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
