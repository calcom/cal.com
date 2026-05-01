import { createContainer } from "@calcom/features/di/di";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import {
  type EventTypeBrandingData,
  type EventTypeService,
  moduleLoader as eventTypeServiceModule,
} from "./EventTypeService.module";

const eventTypeServiceContainer = createContainer();
eventTypeServiceContainer.load(DI_TOKENS.PRISMA_MODULE, prismaModule);

export type { EventTypeBrandingData };

export function getEventTypeService(): EventTypeService {
  eventTypeServiceModule.loadModule(eventTypeServiceContainer);
  return eventTypeServiceContainer.get<EventTypeService>(eventTypeServiceModule.token);
}
