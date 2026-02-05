import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WebhookTaskerProducerService } from "@calcom/features/webhooks/lib/service/WebhookTaskerProducerService";

import { moduleLoader as webhookTaskerModule } from "../tasker/WebhookTasker.module";
import { WEBHOOK_TOKENS } from "../Webhooks.tokens";

/**
 * Producer Service Module
 *
 * Binds the lightweight WebhookTaskerProducerService.
 * Dependencies: WebhookTasker and Logger.
 *
 * The WebhookTasker automatically handles async/sync mode selection:
 * - Production: Queues to Trigger.dev for background processing
 * - E2E Tests: Executes immediately via WebhookSyncTasker
 */
const thisModule = createModule();
const token = WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE;
const moduleToken = WEBHOOK_TOKENS.WEBHOOK_PRODUCER_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookTaskerProducerService,
  depsMap: {
    webhookTasker: webhookTaskerModule,
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export const webhookProducerServiceModule = thisModule;
