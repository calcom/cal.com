-- CreateTable
CREATE TABLE "DelegationCredentialAccesssToken" (
    "id" TEXT NOT NULL,
    "key" JSONB NOT NULL,
    "userId" INTEGER,
    "delegationCredentialId" TEXT NOT NULL,

    CONSTRAINT "DelegationCredentialAccesssToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DelegationCredentialAccesssToken_userId_idx" ON "DelegationCredentialAccesssToken"("userId");

-- CreateIndex
CREATE INDEX "DelegationCredentialAccesssToken_delegationCredentialId_idx" ON "DelegationCredentialAccesssToken"("delegationCredentialId");

-- CreateIndex
CREATE UNIQUE INDEX "DelegationCredentialAccesssToken_delegationCredentialId_use_key" ON "DelegationCredentialAccesssToken"("delegationCredentialId", "userId");

-- AddForeignKey
ALTER TABLE "DelegationCredentialAccesssToken" ADD CONSTRAINT "DelegationCredentialAccesssToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DelegationCredentialAccesssToken" ADD CONSTRAINT "DelegationCredentialAccesssToken_delegationCredentialId_fkey" FOREIGN KEY ("delegationCredentialId") REFERENCES "DelegationCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
