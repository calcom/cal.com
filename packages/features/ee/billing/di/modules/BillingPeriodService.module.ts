import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { DI_TOKENS } from "../tokens";
import { billingPeriodRepositoryModuleLoader } from "./BillingPeriodRepository";

const thisModule = createModule();
const token = DI_TOKENS.BILLING_PERIOD_SERVICE;
const moduleToken = DI_TOKENS.BILLING_PERIOD_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: BillingPeriodService,
  depsMap: {
    repository: billingPeriodRepositoryModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
  },
});

export const billingPeriodServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { BillingPeriodService };
