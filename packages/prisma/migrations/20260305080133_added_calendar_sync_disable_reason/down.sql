-- AlterTable
ALTER TABLE "ExternalCalendar" DROP COLUMN "syncDisabledAt",
DROP COLUMN "syncDisabledBy",
DROP COLUMN "syncDisabledReason";

-- DropEnum
DROP TYPE "CalendarSyncDisabledReason";

-- DropEnum
DROP TYPE "CalendarSyncDisabledBy";

