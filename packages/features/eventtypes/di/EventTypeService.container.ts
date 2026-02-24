import { createContainer } from "@calcom/features/di/di";
import {
  type EventTypeBrandingData,
  type EventTypeService,
  moduleLoader as eventTypeServiceModule,
} from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();

export type { EventTypeBrandingData };

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModule.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModule.token);
}
