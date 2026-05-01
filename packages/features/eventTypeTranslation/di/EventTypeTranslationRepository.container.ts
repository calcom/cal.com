import { createContainer } from "@calcom/features/di/di";

import {
  moduleLoader as eventTypeTranslationRepositoryModuleLoader,
  type EventTypeTranslationRepository,
} from "./EventTypeTranslationRepository.module";

const eventTypeTranslationRepositoryContainer = createContainer();

export function getEventTypeTranslationRepository(): EventTypeTranslationRepository {
  eventTypeTranslationRepositoryModuleLoader.loadModule(eventTypeTranslationRepositoryContainer);
  return eventTypeTranslationRepositoryContainer.get<EventTypeTranslationRepository>(
    eventTypeTranslationRepositoryModuleLoader.token
  );
}
