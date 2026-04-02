import type { CalendarsTasker } from "@calcom/features/calendars/lib/tasker/CalendarsTasker";
import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as taskerModuleLoader } from "./CalendarsTasker.module";

const container = createContainer();

export function getCalendarsTasker(): CalendarsTasker {
  taskerModuleLoader.loadModule(container);
  return container.get<CalendarsTasker>(taskerModuleLoader.token);
}
