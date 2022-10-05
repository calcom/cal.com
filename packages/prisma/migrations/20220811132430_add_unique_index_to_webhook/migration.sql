/*
  Warnings:

  - A unique constraint covering the columns `[userId,subscriberUrl]` on the table `Webhook` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Webhook_userId_subscriberUrl_key" ON "Webhook"("userId", "subscriberUrl");
