import { createContainer } from "@calcom/features/di/di";
import type { PlatformOrganizationBillingTaskService } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingTaskService";
import { moduleLoader as taskServiceModuleLoader } from "./PlatformOrganizationBillingTaskService.module";

const container = createContainer();

export function getPlatformOrganizationBillingTaskService(): PlatformOrganizationBillingTaskService {
  taskServiceModuleLoader.loadModule(container);
  return container.get<PlatformOrganizationBillingTaskService>(taskServiceModuleLoader.token);
}
