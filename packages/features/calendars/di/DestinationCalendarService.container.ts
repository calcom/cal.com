import { createContainer } from "@calcom/features/di/di";

import {
  type DestinationCalendarService,
  moduleLoader as destinationCalendarServiceModuleLoader,
} from "./DestinationCalendarService.module";

const container = createContainer();

export function getDestinationCalendarService(): DestinationCalendarService {
  destinationCalendarServiceModuleLoader.loadModule(container);
  return container.get<DestinationCalendarService>(destinationCalendarServiceModuleLoader.token);
}
