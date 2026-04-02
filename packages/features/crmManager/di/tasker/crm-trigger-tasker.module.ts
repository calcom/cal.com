import { CRMTriggerTasker } from "@calcom/features/crmManager/tasker/crm-trigger-tasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { CRM_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CRM_TASKER_DI_TOKENS.CRM_TRIGGER_TASKER;
const moduleToken = CRM_TASKER_DI_TOKENS.CRM_TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CRMTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
