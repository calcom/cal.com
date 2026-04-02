import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { PlatformOrganizationBillingTasker } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingTasker";
import { moduleLoader as syncTaskerModuleLoader } from "./PlatformOrganizationBillingSyncTasker.module";
import { moduleLoader as triggerTaskerModuleLoader } from "./PlatformOrganizationBillingTriggerTasker.module";
import { PLATFORM_BILLING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TASKER;
const moduleToken = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PlatformOrganizationBillingTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: triggerTaskerModuleLoader,
    syncTasker: syncTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
