import { createContainer } from "@calcom/features/di/di";
import { PlatformOrganizationBillingTasker } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingTasker";

import { moduleLoader as taskerModuleLoader } from "./PlatformOrganizationBillingTasker.module";

const container = createContainer();

export function getPlatformOrganizationBillingTasker(): PlatformOrganizationBillingTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<PlatformOrganizationBillingTasker>(taskerModuleLoader.token);
}
