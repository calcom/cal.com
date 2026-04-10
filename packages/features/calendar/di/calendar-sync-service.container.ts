import { createContainer } from "@calcom/features/di/di";
import {
  type CalendarSyncService,
  moduleLoader as calendarSyncServiceModuleLoader,
} from "./calendar-sync-service.module";

const container = createContainer();

export function getCalendarSyncService(): CalendarSyncService {
  calendarSyncServiceModuleLoader.loadModule(container);
  return container.get<CalendarSyncService>(calendarSyncServiceModuleLoader.token);
}
