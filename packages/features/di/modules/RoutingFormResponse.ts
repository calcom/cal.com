import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyRoutingFormResponseRepository } from "@calcom/lib/server/repository/KyselyRoutingFormResponseRepository";

import { DI_TOKENS } from "../tokens";

export const routingFormResponseRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY)
    .toInstance(new KyselyRoutingFormResponseRepository(kyselyRead, kyselyWrite));
  return module;
};
