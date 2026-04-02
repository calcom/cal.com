import type { CRMTasker } from "@calcom/features/crmManager/tasker/crm-tasker";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as taskerModuleLoader } from "./crm-tasker.module";

const container = createContainer();

export function getCRMTasker(): CRMTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<CRMTasker>(taskerModuleLoader.token);
}
