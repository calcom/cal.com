import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { UserLockedEmailTriggerDevTasker } from "@calcom/features/ee/api-keys/service/userLockedEmail/tasker/UserLockedEmailTriggerDevTasker";

import { USER_LOCKED_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_TRIGGER_TASKER;
const moduleToken = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserLockedEmailTriggerDevTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
