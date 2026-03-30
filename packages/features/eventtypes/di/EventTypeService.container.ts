import { createContainer } from "@calcom/features/di/di";

import {
  type EventTypeBrandingData,
  type EventTypeService,
  moduleLoader as eventTypeServiceModuleLoader,
} from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();

export type { EventTypeBrandingData };

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModuleLoader.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModuleLoader.token);
}
