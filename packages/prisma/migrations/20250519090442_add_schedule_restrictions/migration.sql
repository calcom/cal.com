-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "restrictionScheduleId" INTEGER,
ADD COLUMN     "useBookerTimezone" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_restrictionScheduleId_fkey" FOREIGN KEY ("restrictionScheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;


INSERT INTO "Feature" (slug, enabled) VALUES ('restriction-schedule', false) ON CONFLICT (slug) DO NOTHING;
