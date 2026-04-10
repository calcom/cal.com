import { createContainer } from "@calcom/features/di/di";
import {
  type CalendarCacheService,
  moduleLoader as calendarCacheServiceModuleLoader,
} from "./calendar-cache-service.module";

const container = createContainer();

export function getCalendarCacheService(): CalendarCacheService {
  calendarCacheServiceModuleLoader.loadModule(container);
  return container.get<CalendarCacheService>(calendarCacheServiceModuleLoader.token);
}
