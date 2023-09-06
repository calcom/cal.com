-- CreateTable
CREATE TABLE "CalendarCache" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "credentialId" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarCache_key_key" ON "CalendarCache"("key");

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
