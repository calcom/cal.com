import { type Container, createModule, ModuleLoader, type ResolveFunction } from "@calcom/features/di/di";
import { moduleLoader as kyselyModuleLoader } from "@calcom/features/di/modules/Kysely";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import type { KyselyDb } from "@calcom/kysely";

import { IBillingRepository } from "../../repository/billing/IBillingRepository";
import { KyselyOrganizationBillingRepository } from "../../repository/billing/KyselyOrganizationBillingRepository";
import { KyselyTeamBillingRepository } from "../../repository/billing/KyselyTeamBillingRepository";
import { StubBillingRepository } from "../../repository/billing/StubBillingRepository";
import { DI_TOKENS } from "../tokens";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";

const billingRepositoryFactoryModule = createModule();
const token = DI_TOKENS.BILLING_REPOSITORY_FACTORY;
billingRepositoryFactoryModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const isTeamBillingEnabled = resolve(DI_TOKENS.IS_TEAM_BILLING_ENABLED);

  return (isOrganization: boolean): IBillingRepository => {
    if (!isTeamBillingEnabled) {
      return new StubBillingRepository();
    }

    const kyselyRead = resolve(GLOBAL_DI_TOKENS.KYSELY_READ_DB) as KyselyDb;
    const kyselyWrite = resolve(GLOBAL_DI_TOKENS.KYSELY_WRITE_DB) as KyselyDb;

    if (isOrganization) {
      return new KyselyOrganizationBillingRepository(kyselyRead, kyselyWrite);
    }

    return new KyselyTeamBillingRepository(kyselyRead, kyselyWrite);
  };
});

export const billingRepositoryFactoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependencies first
    kyselyModuleLoader.loadModule(container);
    isTeamBillingEnabledModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.BILLING_REPOSITORY_FACTORY_MODULE, billingRepositoryFactoryModule);
  },
};
