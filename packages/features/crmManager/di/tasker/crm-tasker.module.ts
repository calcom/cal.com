import { CRMTasker } from "@calcom/features/crmManager/tasker/crm-tasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as crmSyncTaskerModuleLoader } from "./crm-sync-tasker.module";
import { moduleLoader as crmTriggerTaskerModuleLoader } from "./crm-trigger-tasker.module";
import { CRM_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CRM_TASKER_DI_TOKENS.CRM_TASKER;
const moduleToken = CRM_TASKER_DI_TOKENS.CRM_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CRMTasker,
  depsMap: {
    logger: loggerServiceModule,
    syncTasker: crmSyncTaskerModuleLoader,
    asyncTasker: crmTriggerTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
