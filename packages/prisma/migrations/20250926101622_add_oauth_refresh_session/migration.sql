-- CreateTable
CREATE TABLE "OAuthRefreshSession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "currentJti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthRefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OAuthRefreshSession_expiresAt_idx" ON "OAuthRefreshSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthRefreshSession_clientId_subjectKey_key" ON "OAuthRefreshSession"("clientId", "subjectKey");

-- AddForeignKey
ALTER TABLE "OAuthRefreshSession" ADD CONSTRAINT "OAuthRefreshSession_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "OAuthClient"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
