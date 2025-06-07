-- DropIndex
DROP INDEX "Credential_userId_idx";

-- CreateIndex
CREATE INDEX "Credential_userId_delegationCredentialId_idx" ON "Credential"("userId", "delegationCredentialId");
