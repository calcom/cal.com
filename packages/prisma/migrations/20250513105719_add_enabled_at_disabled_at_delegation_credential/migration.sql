-- AlterTable
ALTER TABLE "DelegationCredential" ADD COLUMN     "lastDisabledAt" TIMESTAMP(3),
ADD COLUMN     "lastEnabledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "DelegationCredential_enabled_idx" ON "DelegationCredential"("enabled");
