import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { ProrationEmailTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationEmailTasker";

import { moduleLoader as prorationEmailSyncTaskerModule } from "./ProrationEmailSyncTasker.module";
import { moduleLoader as prorationEmailTriggerTaskerModule } from "./ProrationEmailTriggerDevTasker.module";
import { PRORATION_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_TASKER;
const moduleToken = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationEmailTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: prorationEmailTriggerTaskerModule,
    syncTasker: prorationEmailSyncTaskerModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
