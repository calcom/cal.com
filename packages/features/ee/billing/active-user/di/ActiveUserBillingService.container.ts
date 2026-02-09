import { createContainer } from "@calcom/features/di/di";
import type { ActiveUserBillingService } from "@calcom/features/ee/billing/active-user/services/ActiveUserBillingService";

import { moduleLoader as activeUserBillingServiceModuleLoader } from "./ActiveUserBillingService.module";

const container = createContainer();

export function getActiveUserBillingService(): ActiveUserBillingService {
  activeUserBillingServiceModuleLoader.loadModule(container);
  return container.get<ActiveUserBillingService>(activeUserBillingServiceModuleLoader.token);
}
