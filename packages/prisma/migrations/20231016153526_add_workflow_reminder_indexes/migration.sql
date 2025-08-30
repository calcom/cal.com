-- CreateIndex
CREATE INDEX "WorkflowReminder_method_scheduled_scheduledDate_idx" ON "WorkflowReminder"("method", "scheduled", "scheduledDate");

-- CreateIndex
CREATE INDEX "WorkflowReminder_cancelled_scheduledDate_idx" ON "WorkflowReminder"("cancelled", "scheduledDate");
