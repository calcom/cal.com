-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "appId" TEXT;

-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "appId" TEXT;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
