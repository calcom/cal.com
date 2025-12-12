import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyRoutingFormRepository } from "@calcom/lib/server/repository/KyselyRoutingFormRepository";

import { DI_TOKENS } from "../tokens";

export const routingFormRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ROUTING_FORM_REPOSITORY)
    .toInstance(new KyselyRoutingFormRepository(kyselyRead, kyselyWrite));
  return module;
};
