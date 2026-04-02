import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { ProrationEmailSyncTasker } from "@calcom/features/ee/billing/service/proration/tasker/ProrationEmailSyncTasker";
import { PRORATION_EMAIL_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_SYNC_TASKER;
const moduleToken = PRORATION_EMAIL_TASKER_DI_TOKENS.PRORATION_EMAIL_SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ProrationEmailSyncTasker,
  dep: loggerServiceModule,
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
