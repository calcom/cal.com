import type { DestinationCalendarRepository } from "@calcom/lib/server/repository/destinationCalendar";

import { createContainer } from "../di";
import { moduleLoader as destinationCalendarRepositoryModuleLoader } from "../modules/DestinationCalendar";

const container = createContainer();

export function getDestinationCalendarRepository() {
  destinationCalendarRepositoryModuleLoader.loadModule(container);
  return container.get<DestinationCalendarRepository>(destinationCalendarRepositoryModuleLoader.token);
}
