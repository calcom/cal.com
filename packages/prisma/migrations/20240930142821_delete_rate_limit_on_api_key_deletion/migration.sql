-- DropForeignKey
ALTER TABLE "RateLimit" DROP CONSTRAINT "RateLimit_apiKeyId_fkey";

-- AddForeignKey
ALTER TABLE "RateLimit" ADD CONSTRAINT "RateLimit_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
