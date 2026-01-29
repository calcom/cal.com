import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { WebhookAsyncTasker } from "@calcom/features/webhooks/lib/tasker/WebhookAsyncTasker";

import { moduleLoader as taskerModuleLoader } from "./Tasker.module";
import { WEBHOOK_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_ASYNC_TASKER;
const moduleToken = WEBHOOK_TASKER_DI_TOKENS.WEBHOOK_ASYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WebhookAsyncTasker,
  depsMap: {
    tasker: taskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
