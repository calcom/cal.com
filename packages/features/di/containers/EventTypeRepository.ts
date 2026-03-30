import type { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";

import { createContainer } from "../di";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "../modules/EventType";

const container = createContainer();

export function getEventTypeRepository(): EventTypeRepository {
  eventTypeRepositoryModuleLoader.loadModule(container);
  return container.get<EventTypeRepository>(eventTypeRepositoryModuleLoader.token);
}
