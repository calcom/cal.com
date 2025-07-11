import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { RoutingFormResponseRepository } from "@calcom/lib/server/repository/formResponse";

export const routingFormResponseRepositoryModule = createModule();
routingFormResponseRepositoryModule
  .bind(DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY)
  .toClass(RoutingFormResponseRepository, [DI_TOKENS.PRISMA_CLIENT]);
