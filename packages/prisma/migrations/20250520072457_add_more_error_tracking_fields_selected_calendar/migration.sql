-- DropIndex
DROP INDEX "SelectedCalendar_integration_idx";

-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN     "lastErrorAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "unwatchAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watchAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "SelectedCalendar_watch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "watchAttempts", "maxAttempts");

-- CreateIndex
CREATE INDEX "SelectedCalendar_unwatch_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "unwatchAttempts", "maxAttempts");
