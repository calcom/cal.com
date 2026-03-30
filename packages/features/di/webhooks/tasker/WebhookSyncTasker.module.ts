import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { WebhookSyncTasker } from "@calcom/features/webhooks/lib/tasker/WebhookSyncTasker";

import { moduleLoader as webhookTaskConsumerModuleLoader } from "./WebhookTaskConsumer.module";
import { WEBHOOK_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_SYNC_TASKER;
const moduleToken = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookSyncTasker,
  depsMap: {
    webhookTaskConsumer: webhookTaskConsumerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
