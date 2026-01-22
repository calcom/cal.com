import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { billingProviderServiceModuleLoader } from "@calcom/features/ee/billing/di/modules/BillingProviderService";
import { PlatformOrganizationBillingTaskService } from "@calcom/features/ee/organizations/lib/billing/tasker/PlatformOrganizationBillingTaskService";

import { moduleLoader as organizationRepositoryModuleLoader } from "../OrganizationRepository.module";
import { moduleLoader as platformBillingRepositoryModuleLoader } from "./PlatformBillingRepository.module";
import { PLATFORM_BILLING_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TASK_SERVICE;
const moduleToken = PLATFORM_BILLING_TASKER_DI_TOKENS.PLATFORM_ORGANIZATION_BILLING_TASK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PlatformOrganizationBillingTaskService,
  depsMap: {
    logger: loggerServiceModule,
    organizationRepository: organizationRepositoryModuleLoader,
    platformBillingRepository: platformBillingRepositoryModuleLoader,
    billingProviderService: billingProviderServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
