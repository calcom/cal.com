import { createContainer } from "@calcom/features/di/di";
import { type EventTypeService, moduleLoader as eventTypeServiceModule } from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModule.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModule.token);
}
