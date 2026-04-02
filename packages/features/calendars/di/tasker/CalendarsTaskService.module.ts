import { CalendarsTaskService } from "@calcom/features/calendars/lib/tasker/CalendarsTaskService";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { moduleLoader as loggerServiceModule } from "@calcom/features/di/shared/services/logger.service";
import { CALENDARS_TASKER_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASK_SERVICE;
const moduleToken = CALENDARS_TASKER_DI_TOKENS.CALENDARS_TASK_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CalendarsTaskService,
  depsMap: {
    logger: loggerServiceModule,
    prisma: prismaModuleLoader,
  },
});

export const moduleLoader = {
  token,
  loadModule,
} satisfies ModuleLoader;
