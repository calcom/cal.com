import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WorkflowTasker } from "@calcom/features/ee/workflows/lib/tasker/WorkflowTasker";

import { moduleLoader as WorkflowSyncTasker } from "./WorkflowSyncTasker.module";
import { moduleLoader as WorkflowTriggerTasker } from "./WorkflowTriggerDevTasker.module";
import { WORKFLOW_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TASKER;
const moduleToken = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: WorkflowTriggerTasker,
    syncTasker: WorkflowSyncTasker,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
