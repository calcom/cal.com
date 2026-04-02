import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { MonthlyProrationTriggerDevTasker } from "@calcom/features/ee/billing/service/proration/tasker/MonthlyProrationTriggerDevTasker";
import { MONTHLY_PRORATION_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_TRIGGER_TASKER;
const moduleToken = MONTHLY_PRORATION_TASKER_DI_TOKENS.MONTHLY_PRORATION_TRIGGER_TASKER_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: MonthlyProrationTriggerDevTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
