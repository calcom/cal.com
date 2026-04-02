import type { CalendarsTaskService } from "@calcom/features/calendars/lib/tasker/CalendarsTaskService";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as taskServiceModuleLoader } from "./CalendarsTaskService.module";

const container = createContainer();

export function getCalendarsTaskService(): CalendarsTaskService {
  taskServiceModuleLoader.loadModule(container);
  return container.get<CalendarsTaskService>(taskServiceModuleLoader.token);
}
