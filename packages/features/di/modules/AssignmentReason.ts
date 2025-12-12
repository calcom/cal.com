import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyAssignmentReasonRepository } from "@calcom/lib/server/repository/KyselyAssignmentReasonRepository";

import { DI_TOKENS } from "../tokens";

export const assignmentReasonRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY)
    .toInstance(new KyselyAssignmentReasonRepository(kyselyRead, kyselyWrite));
  return module;
};

