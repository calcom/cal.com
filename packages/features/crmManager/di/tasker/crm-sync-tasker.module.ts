import { CRMSyncTasker } from "@calcom/features/crmManager/tasker/crm-sync-tasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as crmTaskServiceModuleLoader } from "./crm-task-service.module";
import { CRM_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CRM_TASKER_DI_TOKENS.CRM_SYNC_TASKER;
const moduleToken = CRM_TASKER_DI_TOKENS.CRM_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CRMSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    crmTaskService: crmTaskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
