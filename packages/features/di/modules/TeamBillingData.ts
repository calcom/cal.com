import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyTeamBillingDataRepository } from "../../ee/billing/repository/teamBillingData/KyselyTeamBillingDataRepository";
import { DI_TOKENS } from "../tokens";

export const teamBillingDataRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY)
    .toInstance(new KyselyTeamBillingDataRepository(kyselyRead, kyselyWrite));
  return module;
};
