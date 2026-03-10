import { createContainer } from "@calcom/features/di/di";
import {
  type CalendarSyncService,
  moduleLoader as calendarSyncServiceModuleLoader,
} from "./CalendarSyncService.module";

const container = createContainer();

export function getCalendarSyncService(): CalendarSyncService {
  calendarSyncServiceModuleLoader.loadModule(container);
  return container.get<CalendarSyncService>(calendarSyncServiceModuleLoader.token);
}
