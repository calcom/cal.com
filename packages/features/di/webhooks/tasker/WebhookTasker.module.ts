import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WebhookTasker } from "@calcom/features/webhooks/lib/tasker/WebhookTasker";

import { moduleLoader as webhookSyncTaskerModule } from "./WebhookSyncTasker.module";
import { moduleLoader as webhookTriggerTaskerModule } from "./WebhookTriggerTasker.module";
import { WEBHOOK_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_TASKER;
const moduleToken = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: webhookTriggerTaskerModule,
    syncTasker: webhookSyncTaskerModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;

export type { WebhookTasker };
