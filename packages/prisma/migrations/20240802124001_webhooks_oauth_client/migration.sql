/*
  Warnings:

  - A unique constraint covering the columns `[platformOAuthClientId,subscriberUrl]` on the table `Webhook` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Webhook" ADD COLUMN     "platformOAuthClientId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Webhook_platformOAuthClientId_subscriberUrl_key" ON "Webhook"("platformOAuthClientId", "subscriberUrl");

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_platformOAuthClientId_fkey" FOREIGN KEY ("platformOAuthClientId") REFERENCES "PlatformOAuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
