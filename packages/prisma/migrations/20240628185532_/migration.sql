-- DropForeignKey
ALTER TABLE "Host" DROP CONSTRAINT "Host_scheduleId_fkey";

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
