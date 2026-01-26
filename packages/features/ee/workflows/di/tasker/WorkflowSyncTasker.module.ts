import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WorkflowSyncTasker } from "@calcom/features/ee/workflows/lib/tasker/WorkflowSyncTasker";

import { moduleLoader as WorkflowTaskServiceModuleLoader } from "./WorkflowTaskService.module";
import { WORKFLOW_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_SYNC_TASKER;
const moduleToken = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    workflowTaskService: WorkflowTaskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
