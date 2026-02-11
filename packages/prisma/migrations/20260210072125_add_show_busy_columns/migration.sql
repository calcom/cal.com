-- Add show busy columns (original applied schema)
ALTER TABLE "EventType"
ADD COLUMN "showBusy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "showBusyPercent" INTEGER,
ADD COLUMN "showBusySlots" JSONB;
