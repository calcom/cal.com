-- CreateTable
CREATE TABLE "CalIdApiKey" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "hashedKey" TEXT NOT NULL,
    "appId" TEXT,
    "teamId" INTEGER,

    CONSTRAINT "CalIdApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalIdRateLimit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "calIdApiKeyId" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "blockDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalIdRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalIdApiKey_id_key" ON "CalIdApiKey"("id");

-- CreateIndex
CREATE UNIQUE INDEX "CalIdApiKey_hashedKey_key" ON "CalIdApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "CalIdApiKey_userId_idx" ON "CalIdApiKey"("userId");

-- CreateIndex
CREATE INDEX "CalIdApiKey_teamId_idx" ON "CalIdApiKey"("teamId");

-- CreateIndex
CREATE INDEX "CalIdRateLimit_calIdApiKeyId_idx" ON "CalIdRateLimit"("calIdApiKeyId");

-- AddForeignKey
ALTER TABLE "CalIdApiKey" ADD CONSTRAINT "CalIdApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdApiKey" ADD CONSTRAINT "CalIdApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdApiKey" ADD CONSTRAINT "CalIdApiKey_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "CalIdTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalIdRateLimit" ADD CONSTRAINT "CalIdRateLimit_calIdApiKeyId_fkey" FOREIGN KEY ("calIdApiKeyId") REFERENCES "CalIdApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
