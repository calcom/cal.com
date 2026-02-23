import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { CalendarsTriggerTasker } from "@calcom/features/calendars/lib/tasker/CalendarsTriggerTasker";

import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TRIGGER_TASKER;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TRIGGER_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsTriggerTasker,
  depsMap: {
    logger: loggerServiceModule,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
