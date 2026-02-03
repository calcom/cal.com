import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { MonthlyProrationSyncTasker } from "@calcom/features/ee/billing/service/proration/tasker/MonthlyProrationSyncTasker";

import { MONTHLY_PRORATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_SYNC_TASKER;
const moduleToken = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_SYNC_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MonthlyProrationSyncTasker,
  dep: loggerServiceModule,
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
