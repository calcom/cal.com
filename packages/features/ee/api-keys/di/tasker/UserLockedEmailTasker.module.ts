import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { UserLockedEmailTasker } from "@calcom/features/ee/api-keys/service/userLockedEmail/tasker/UserLockedEmailTasker";
import { USER_LOCKED_EMAIL_TASKER_DI_TOKENS } from "./tokens";
import { moduleLoader as userLockedEmailSyncTaskerModule } from "./UserLockedEmailSyncTasker.module";
import { moduleLoader as userLockedEmailTriggerTaskerModule } from "./UserLockedEmailTriggerDevTasker.module";

const thisModule = createModule();
const token = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_TASKER;
const moduleToken = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserLockedEmailTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: userLockedEmailTriggerTaskerModule,
    syncTasker: userLockedEmailSyncTaskerModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
