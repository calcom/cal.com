-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "ttl" INTEGER NOT NULL,
    "limit" INTEGER NOT NULL,
    "blockDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimit_apiKeyId_idx" ON "RateLimit"("apiKeyId");

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
