import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { ProrationEmailTriggerDevTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationEmailTriggerDevTasker";

import { PRORATION_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_TRIGGER_TASKER;
const moduleToken = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationEmailTriggerDevTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
