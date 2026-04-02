import type { CRMTaskService } from "@calcom/features/crmManager/tasker/crm-task-service";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as taskServiceModuleLoader } from "./crm-task-service.module";

const container = createContainer();

export function getCRMTaskService(): CRMTaskService {
  taskServiceModuleLoader.loadModule(container);
  return container.get<CRMTaskService>(taskServiceModuleLoader.token);
}
