import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";
import { KyselyOrgMembershipRepository } from "@calcom/lib/server/repository/KyselyOrgMembershipRepository";

import { DI_TOKENS } from "../tokens";

export const orgMembershipRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ORG_MEMBERSHIP_REPOSITORY)
    .toInstance(new KyselyOrgMembershipRepository(kyselyRead, kyselyWrite));
  return module;
};
