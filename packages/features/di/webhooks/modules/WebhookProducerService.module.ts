import { createModule } from "@evyweb/ioctopus";

import { WebhookTaskerProducerService } from "@calcom/features/webhooks/lib/service/WebhookTaskerProducerService";

import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

/**
 * Producer Service Module
 * 
 * Binds the lightweight WebhookTaskerProducerService.
 * Dependencies: Only Tasker and Logger (no heavy deps).
 */
export const webhookProducerServiceModule = createModule();

webhookProducerServiceModule
  .bind(WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE)
  .toClass(WebhookTaskerProducerService, [SHARED_TOKENS.TASKER, SHARED_TOKENS.LOGGER]);
