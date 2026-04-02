import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { PlatformOrganizationBillingSyncTasker } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingSyncTasker";
import { moduleLoader as taskServiceModuleLoader } from "./PlatformOrganizationBillingTaskService.module";
import { PLATFORM_BILLING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_SYNC_TASKER;
const moduleToken = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PlatformOrganizationBillingSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    billingTaskService: taskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
