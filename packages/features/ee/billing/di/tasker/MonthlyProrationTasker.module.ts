import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { MonthlyProrationTasker } from "@calcom/features/ee/billing/service/proration/tasker/MonthlyProrationTasker";

import { moduleLoader as monthlyProrationSyncTaskerModule } from "./MonthlyProrationSyncTasker.module";
import { moduleLoader as monthlyProrationTriggerTaskerModule } from "./MonthlyProrationTriggerDevTasker.module";
import { MONTHLY_PRORATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_TASKER;
const moduleToken = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MonthlyProrationTasker,
  depsMap: {
    logger: loggerServiceModule,
    asyncTasker: monthlyProrationTriggerTaskerModule,
    syncTasker: monthlyProrationSyncTaskerModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
