import { CRMTaskService } from "@calcom/features/crmManager/tasker/crm-task-service";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { CRM_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CRM_TASKER_DI_TOKENS.CRM_TASK_SERVICE;
const moduleToken = CRM_TASKER_DI_TOKENS.CRM_TASK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CRMTaskService,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
