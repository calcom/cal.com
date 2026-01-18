import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { UserLockedEmailSyncTasker } from "@calcom/features/ee/api-keys/service/userLockedEmail/tasker/UserLockedEmailSyncTasker";

import { USER_LOCKED_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_SYNC_TASKER;
const moduleToken = USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserLockedEmailSyncTasker,
  dep: loggerServiceModule,
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
