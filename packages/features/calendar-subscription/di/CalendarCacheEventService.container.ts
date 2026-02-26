import { createContainer } from "@calcom/features/di/di";
import {
  type CalendarCacheEventService,
  moduleLoader as calendarCacheEventServiceModuleLoader,
} from "./CalendarCacheEventService.module";

const container = createContainer();

export function getCalendarCacheEventService(): CalendarCacheEventService {
  calendarCacheEventServiceModuleLoader.loadModule(container);
  return container.get<CalendarCacheEventService>(calendarCacheEventServiceModuleLoader.token);
}
