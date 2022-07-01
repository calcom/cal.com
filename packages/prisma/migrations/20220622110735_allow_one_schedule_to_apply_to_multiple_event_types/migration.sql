
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_eventTypeId_fkey";

-- DropIndex
DROP INDEX "Schedule_eventTypeId_key";

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "scheduleId" INTEGER;

UPDATE "EventType"
SET 
  "scheduleId" = subquery.id 
FROM (
  SELECT id, "eventTypeId" FROM "Schedule"
) AS subquery
WHERE
  "EventType".id = subquery."eventTypeId";

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "eventTypeId";

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
