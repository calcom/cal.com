import type { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";

import { WEBHOOK_TOKENS } from "../Webhooks.tokens";
import { webhookTaskConsumerModule } from "../modules/WebhookTaskConsumer.module";
import { webhookContainer } from "./webhook";

// Load the consumer module eagerly
webhookContainer.load(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER, webhookTaskConsumerModule);

/**
 * Get the Webhook Task Consumer.
 * 
 * This is the heavy service for processing webhook delivery tasks.
 * It fetches data from database, builds payloads, and sends HTTP requests.
 */
export function getWebhookTaskConsumer(): WebhookTaskConsumer {
  return webhookContainer.get<WebhookTaskConsumer>(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER);
}
