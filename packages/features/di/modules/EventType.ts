import { DI_TOKENS } from "@calcom/features/di/tokens";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";

import { createModule } from "../di";

export const eventTypeRepositoryModule = createModule();
eventTypeRepositoryModule
  .bind(DI_TOKENS.EVENT_TYPE_REPOSITORY)
  .toClass(EventTypeRepository, [DI_TOKENS.PRISMA_CLIENT]);
