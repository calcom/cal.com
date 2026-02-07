import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { PlatformOrganizationBillingTriggerTasker } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingTriggerTasker";

import { PLATFORM_BILLING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TRIGGER_TASKER;
const moduleToken = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PlatformOrganizationBillingTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
