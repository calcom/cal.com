-- AlterTable
ALTER TABLE "WebhookScheduledTriggers" ADD COLUMN     "webhookId" TEXT;

-- AddForeignKey
ALTER TABLE "WebhookScheduledTriggers" ADD CONSTRAINT "WebhookScheduledTriggers_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE SET NULL ON UPDATE CASCADE;
