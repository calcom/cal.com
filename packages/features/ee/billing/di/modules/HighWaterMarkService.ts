import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { moduleLoader as triggerDevLoggerServiceModule } from "@calcom/features/di/shared/services/triggerDevLogger.service";
import { HighWaterMarkService } from "@calcom/features/ee/billing/service/highWaterMark/HighWaterMarkService";

import { DI_TOKENS } from "../tokens";
import { billingProviderServiceModuleLoader } from "./BillingProviderService";
import { highWaterMarkRepositoryModuleLoader } from "./HighWaterMarkRepository";
import { monthlyProrationTeamRepositoryModuleLoader } from "./MonthlyProrationTeamRepository";

const thisModule = createModule();
const token = DI_TOKENS.HIGH_WATER_MARK_SERVICE;
const moduleToken = DI_TOKENS.HIGH_WATER_MARK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: HighWaterMarkService,
  depsMap: {
    logger: triggerDevLoggerServiceModule,
    repository: highWaterMarkRepositoryModuleLoader,
    teamRepository: monthlyProrationTeamRepositoryModuleLoader,
    billingService: billingProviderServiceModuleLoader,
    featuresRepository: featuresRepositoryModuleLoader,
  },
});

export const highWaterMarkServiceModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { HighWaterMarkService };
