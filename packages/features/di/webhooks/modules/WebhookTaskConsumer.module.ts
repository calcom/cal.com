import { createModule } from "@evyweb/ioctopus";

import { WebhookTaskConsumer } from "@calcom/features/webhooks/lib/service/WebhookTaskConsumer";

import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

/**
 * Consumer Module
 * 
 * Binds the heavy WebhookTaskConsumer.
 * Dependencies: WebhookRepository, Logger (and future: PayloadBuilders, BookingRepository, etc.)
 * 
 * TODO: Add more dependencies as we implement full data fetching and payload building.
 */
export const webhookTaskConsumerModule = createModule();

webhookTaskConsumerModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_TASK_CONSUMER)
  .toClass(WebhookTaskConsumer, [
    WEBHOOK_TOKENS.WEBHOOK_REPOSITORY,
    SHARED_TOKENS.LOGGER,
    // TODO: Add PayloadBuilders, BookingRepository, EventTypeRepository, etc.
  ]);
