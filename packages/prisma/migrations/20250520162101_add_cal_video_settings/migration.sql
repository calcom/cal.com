-- CreateTable
CREATE TABLE "CalVideoSettings" (
    "eventTypeId" INTEGER NOT NULL,
    "disableRecordingForOrganizer" BOOLEAN NOT NULL DEFAULT false,
    "disableRecordingForGuests" BOOLEAN NOT NULL DEFAULT false,
    "redirectUrlOnExit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "CalVideoSettings_eventTypeId_idx" ON "CalVideoSettings"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CalVideoSettings_eventTypeId_key" ON "CalVideoSettings"("eventTypeId");

-- AddForeignKey
ALTER TABLE "CalVideoSettings" ADD CONSTRAINT "CalVideoSettings_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
