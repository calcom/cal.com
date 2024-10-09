-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "scheduleId" INTEGER;

-- CreateIndex
CREATE INDEX "Host_scheduleId_idx" ON "Host"("scheduleId");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
