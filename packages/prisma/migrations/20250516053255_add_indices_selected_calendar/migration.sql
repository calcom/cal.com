-- DropIndex
DROP INDEX "SelectedCalendar_integration_idx";

-- CreateIndex
CREATE INDEX "SelectedCalendar_integration_googleChannelExpiration_error__idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "error", "watchAttempts");

-- CreateIndex
CREATE INDEX "SelectedCalendar_integration_googleChannelExpiration_unwatc_idx" ON "SelectedCalendar"("integration", "googleChannelExpiration", "unwatchError", "unwatchAttempts");
