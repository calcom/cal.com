import { createContainer } from "@calcom/features/di/di";
import {
  type EventTypeTranslationRepository,
  moduleLoader as eventTypeTranslationRepositoryModuleLoader,
} from "./EventTypeTranslationRepository.module";

const eventTypeTranslationRepositoryContainer = createContainer();

export function getEventTypeTranslationRepository(): EventTypeTranslationRepository {
  eventTypeTranslationRepositoryModuleLoader.loadModule(eventTypeTranslationRepositoryContainer);
  return eventTypeTranslationRepositoryContainer.get<EventTypeTranslationRepository>(
    eventTypeTranslationRepositoryModuleLoader.token
  );
}
