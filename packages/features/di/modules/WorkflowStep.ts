import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyWorkflowStepRepository } from "@calcom/lib/server/repository/KyselyWorkflowStepRepository";

import { DI_TOKENS } from "../tokens";

export const workflowStepRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.WORKFLOW_STEP_REPOSITORY)
    .toInstance(new KyselyWorkflowStepRepository(kyselyRead, kyselyWrite));
  return module;
};
