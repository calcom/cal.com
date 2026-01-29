import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as bookingRepositoryModuleLoader } from "@calcom/features/di/modules/Booking";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { WorkflowTaskService } from "@calcom/features/ee/workflows/lib/tasker/WorkflowTaskService";

import { WORKFLOW_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TASK_SERVICE;
const moduleToken = WORKFLOW_TASKER_DI_TOKENS.WORKFLOW_TASK_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowTaskService,
  depsMap: {
    logger: loggerServiceModule,
    bookingRepository: bookingRepositoryModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
