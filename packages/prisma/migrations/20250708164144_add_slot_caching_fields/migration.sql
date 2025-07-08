-- AlterTable
ALTER TABLE "CalendarCache" ADD COLUMN     "availableCount" INTEGER,
ADD COLUMN     "cacheType" TEXT DEFAULT 'calendar',
ADD COLUMN     "eventTypeId" INTEGER,
ADD COLUMN     "totalSlots" INTEGER;

-- CreateIndex
CREATE INDEX "CalendarCache_eventTypeId_cacheType_idx" ON "CalendarCache"("eventTypeId", "cacheType");
