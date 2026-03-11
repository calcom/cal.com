import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as destinationCalendarRepositoryModuleLoader } from "@calcom/features/di/modules/DestinationCalendar";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "@calcom/features/di/modules/EventType";

import { DestinationCalendarService } from "../services/DestinationCalendarService";
import { CALENDARS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CALENDARS_DI_TOKENS.DESTINATION_CALENDAR_SERVICE;
const moduleToken = CALENDARS_DI_TOKENS.DESTINATION_CALENDAR_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: DestinationCalendarService,
  depsMap: {
    destinationCalendarRepository: destinationCalendarRepositoryModuleLoader,
    eventTypeRepository: eventTypeRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { DestinationCalendarService };
