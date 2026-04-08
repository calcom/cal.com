-- CreateIndex
CREATE INDEX "WebhookScheduledTriggers_startAfter_idx" ON "WebhookScheduledTriggers"("startAfter");

-- CreateIndex
CREATE INDEX "WebhookScheduledTriggers_webhookId_idx" ON "WebhookScheduledTriggers"("webhookId")
WHERE "webhookId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "AttributeOption_attributeId_idx" ON "AttributeOption"("attributeId");

-- CreateIndex
CREATE INDEX "AttributeToUser_attributeOptionId_idx" ON "AttributeToUser"("attributeOptionId");
