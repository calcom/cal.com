-- CreateTable
CREATE TABLE
  "CalendarCache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "credentialId" INTEGER NOT NULL,
    CONSTRAINT "CalendarCache_pkey" PRIMARY KEY ("credentialId", "key")
  );

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCache_credentialId_key_key" ON "CalendarCache" ("credentialId", "key");

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add Feature Flag
INSERT INTO
  "Feature" (slug, enabled, description, "type")
VALUES
  (
    'calendar-cache',
    false,
    'Enable Third Party Calendar Cache - Cache third party calendar events to reduce the number of API calls to third party calendar providers.',
    'OPERATIONAL'
  ) ON CONFLICT (slug) DO NOTHING;
