import { createContainer } from "@calcom/features/di/di";
import { type CalendarService, moduleLoader as calendarServiceModuleLoader } from "./calendar-service.module";

const container = createContainer();

export function getCalendarService(): CalendarService {
  calendarServiceModuleLoader.loadModule(container);
  return container.get<CalendarService>(calendarServiceModuleLoader.token);
}
