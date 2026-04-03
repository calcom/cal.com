import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { ActiveUserBillingService } from "@calcom/features/ee/billing/active-user/services/ActiveUserBillingService";

import { moduleLoader as activeUserBillingRepositoryModuleLoader } from "./ActiveUserBillingRepository.module";
import { ACTIVE_USER_BILLING_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ACTIVE_USER_BILLING_DI_TOKENS.ACTIVE_USER_BILLING_SERVICE;
const moduleToken = ACTIVE_USER_BILLING_DI_TOKENS.ACTIVE_USER_BILLING_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ActiveUserBillingService,
  depsMap: {
    activeUserBillingRepository: activeUserBillingRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
