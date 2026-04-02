import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as featuresRepositoryModuleLoader } from "@calcom/features/di/modules/FeaturesRepository";
import { moduleLoader as triggerDevLoggerServiceModule } from "@calcom/features/di/shared/services/triggerDevLogger.service";
import { MonthlyProrationService } from "@calcom/features/ee/billing/service/proration/MonthlyProrationService";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.MONTHLY_PRORATION_SERVICE;
const moduleToken = DI_TOKENS.MONTHLY_PRORATION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MonthlyProrationService,
  depsMap: {
    logger: triggerDevLoggerServiceModule,
    featuresRepository: featuresRepositoryModuleLoader,
  },
});

export const monthlyProrationServiceModuleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
