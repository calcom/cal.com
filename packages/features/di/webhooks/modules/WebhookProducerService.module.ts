import type { Container } from "@evyweb/ioctopus";
import { createModule } from "@evyweb/ioctopus";

import type { ModuleLoader } from "@calcom/features/di/di";
import { WebhookTaskerProducerService } from "@calcom/features/webhooks/lib/service/WebhookTaskerProducerService";

import { moduleLoader as loggerModuleLoader } from "../../shared/services/logger.service";
import { SHARED_TOKENS } from "../../shared/shared.tokens";
import { moduleLoader as taskerModuleLoader } from "../../shared/services/tasker.service";
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

const token = WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE;

const loadModule = (container: Container) => {
  // Load dependencies first
  taskerModuleLoader.loadModule(container);
  loggerModuleLoader.loadModule(container);
  // Then load this module
  container.load(token, webhookProducerServiceModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
