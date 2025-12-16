-- Add Google Calendar OOO sync columns to OutOfOfficeEntry
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN "googleCalendarEventId" TEXT;
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN "googleCalendarId" TEXT;
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN "credentialId" INTEGER;
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN "syncedFromGoogleCalendar" BOOLEAN NOT NULL DEFAULT false;

-- Add foreign key for credential
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add unique constraint to prevent duplicate synced events per user
CREATE UNIQUE INDEX "OutOfOfficeEntry_userId_googleCalendarEventId_key"
  ON "OutOfOfficeEntry"("userId", "googleCalendarEventId")
  WHERE "googleCalendarEventId" IS NOT NULL;

-- Add index for faster lookups by Google Calendar event ID
CREATE INDEX "OutOfOfficeEntry_googleCalendarEventId_idx" ON "OutOfOfficeEntry"("googleCalendarEventId");
