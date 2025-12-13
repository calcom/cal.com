import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAgentRepository } from "@calcom/lib/server/repository/KyselyAgentRepository";

import { DI_TOKENS } from "../tokens";

export const agentRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.AGENT_REPOSITORY)
    .toInstance(new KyselyAgentRepository(kyselyRead, kyselyWrite));
  return module;
};
