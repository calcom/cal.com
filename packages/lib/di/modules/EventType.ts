import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventTypeRepository";

export const eventTypeRepositoryModule = createModule();
eventTypeRepositoryModule
  .bind(DI_TOKENS.EVENT_TYPE_REPOSITORY)
  .toClass(EventTypeRepository, [DI_TOKENS.PRISMA_CLIENT]);
