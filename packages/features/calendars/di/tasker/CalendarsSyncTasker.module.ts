import { CalendarsSyncTasker } from "@calcom/features/calendars/lib/tasker/CalendarsSyncTasker";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { moduleLoader as calendarsTaskServiceModuleLoader } from "./CalendarsTaskService.module";
import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_SYNC_TASKER;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_SYNC_TASKER_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsSyncTasker,
  depsMap: {
    logger: loggerServiceModule,
    calendarsTaskService: calendarsTaskServiceModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
