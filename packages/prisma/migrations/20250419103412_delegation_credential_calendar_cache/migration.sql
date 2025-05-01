-- AlterTable
ALTER TABLE "CalendarCache" ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "delegationCredentialId" TEXT;

-- CreateIndex
CREATE INDEX "CalendarCache_userId_key_idx" ON "CalendarCache"("userId", "key");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
