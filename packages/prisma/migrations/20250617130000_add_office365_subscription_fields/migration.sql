-- AlterTable
ALTER TABLE "SelectedCalendar" ADD COLUMN "office365SubscriptionId" TEXT,
ADD COLUMN "office365SubscriptionExpiration" TEXT,
ADD COLUMN "office365SubscriptionResource" TEXT,
ADD COLUMN "office365SubscriptionClientState" TEXT;

-- CreateIndex
CREATE INDEX "SelectedCalendar_office365_watch_idx" ON "SelectedCalendar"("integration", "office365SubscriptionExpiration", "error", "watchAttempts", "maxAttempts");

-- CreateIndex
CREATE INDEX "SelectedCalendar_office365_unwatch_idx" ON "SelectedCalendar"("integration", "office365SubscriptionExpiration", "error", "unwatchAttempts", "maxAttempts");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedCalendar_office365SubscriptionId_eventTypeId_key" ON "SelectedCalendar"("office365SubscriptionId", "eventTypeId");
