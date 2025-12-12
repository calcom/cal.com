import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyWorkflowRelationsRepository } from "@calcom/lib/server/repository/KyselyWorkflowRelationsRepository";

import { DI_TOKENS } from "../tokens";

export const workflowRelationsRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.WORKFLOW_RELATIONS_REPOSITORY)
    .toInstance(new KyselyWorkflowRelationsRepository(kyselyRead, kyselyWrite));
  return module;
};
