import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as calendarCacheEventRepositoryModuleLoader } from "./CalendarCacheEventRepository.module";

const container = createContainer();

export function getCalendarCacheEventRepository(): ICalendarCacheEventRepository {
  calendarCacheEventRepositoryModuleLoader.loadModule(container);
  return container.get<ICalendarCacheEventRepository>(calendarCacheEventRepositoryModuleLoader.token);
}
