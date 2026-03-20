import { createContainer } from "@calcom/features/di/di";
import type { WebhookEventService } from "@calcom/features/ee/billing/service/webhookEvent/WebhookEventService";
import { webhookEventServiceModuleLoader } from "../modules/WebhookEventService.module";
import { DI_TOKENS } from "../tokens";

const container = createContainer();

export function getWebhookEventService(): WebhookEventService {
  webhookEventServiceModuleLoader.loadModule(container);
  return container.get<WebhookEventService>(DI_TOKENS.WEBHOOK_EVENT_SERVICE);
}
