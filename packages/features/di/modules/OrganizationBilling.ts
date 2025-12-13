import { createModule } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyOrganizationBillingRepository } from "../../ee/billing/repository/billing/KyselyOrganizationBillingRepository";
import { DI_TOKENS } from "../tokens";

export const organizationBillingRepositoryModuleLoader = () => {
  const module = createModule();
  module
    .bind(DI_TOKENS.ORGANIZATION_BILLING_REPOSITORY)
    .toInstance(new KyselyOrganizationBillingRepository(kyselyRead, kyselyWrite));
  return module;
};
