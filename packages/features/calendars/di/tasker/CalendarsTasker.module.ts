import { CalendarsTasker } from "@calcom/features/calendars/lib/tasker/CalendarsTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as calendarsSyncTaskerModuleLoader } from "./CalendarsSyncTasker.module";
import { moduleLoader as calendarsTriggerTaskerModuleLoader } from "./CalendarsTriggerTasker.module";
import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASKER;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsTasker,
  depsMap: {
    logger: loggerServiceModule,
    syncTasker: calendarsSyncTaskerModuleLoader,
    asyncTasker: calendarsTriggerTaskerModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
