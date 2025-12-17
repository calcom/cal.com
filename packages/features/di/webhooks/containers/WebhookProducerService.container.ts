import type { IWebhookProducerService } from "@calcom/features/webhooks/lib/interface/WebhookProducerService";

import { WEBHOOK_TOKENS } from "../Webhooks.tokens";
import { webhookProducerServiceModule } from "../modules/WebhookProducerService.module";
import { webhookContainer } from "./webhook";

// Load the producer module eagerly
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE, webhookProducerServiceModule);

/**
 * Get the Webhook Producer Service.
 * 
 * This is the lightweight service for queueing webhook delivery tasks.
 * It has NO heavy dependencies (no Prisma, no repositories).
 */
export function getWebhookProducerService(): IWebhookProducerService {
  return webhookContainer.get<IWebhookProducerService>(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE);
}
