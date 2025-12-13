import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyTeamBillingRepository } from "../../ee/billing/repository/billing/KyselyTeamBillingRepository";
import { DI_TOKENS } from "../tokens";

export const teamBillingRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.TEAM_BILLING_REPOSITORY)
    .toInstance(new KyselyTeamBillingRepository(kyselyRead, kyselyWrite));
  return module;
};
