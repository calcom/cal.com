-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "syncConfig" JSONB,
ADD COLUMN     "syncCredentialId" INTEGER,
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncLastAt" TIMESTAMP(3),
ADD COLUMN     "syncSource" TEXT;

-- CreateIndex
CREATE INDEX "Schedule_syncCredentialId_idx" ON "Schedule"("syncCredentialId");

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_syncCredentialId_fkey" FOREIGN KEY ("syncCredentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
