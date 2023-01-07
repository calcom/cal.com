-- CreateIndex
CREATE INDEX "Availability_eventTypeId_idx" ON "Availability"("eventTypeId");

-- CreateIndex
CREATE INDEX "Availability_scheduleId_idx" ON "Availability"("scheduleId");

-- CreateIndex
CREATE INDEX "Schedule_userId_idx" ON "Schedule"("userId");
