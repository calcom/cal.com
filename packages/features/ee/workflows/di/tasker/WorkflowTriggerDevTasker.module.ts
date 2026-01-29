import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WorkflowTriggerDevTasker } from "@calcom/features/ee/workflows/lib/tasker/WorkflowTriggerDevTasker";

import { WORKFLOW_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TRIGGER_TASKER;
const moduleToken = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowTriggerDevTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
