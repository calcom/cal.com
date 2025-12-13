import { type Container, createModule, ModuleLoader, type ResolveFunction } from "@calcom/features/di/di";
import { moduleLoader as kyselyModuleLoader } from "@calcom/features/di/modules/Kysely";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import type { KyselyDb } from "@calcom/kysely";

import { KyselyTeamBillingDataRepository } from "../../repository/teamBillingData/KyselyTeamBillingDataRepository";
import { StubTeamBillingDataRepository } from "../../repository/teamBillingData/StubTeamBillingRepository";
import { DI_TOKENS } from "../tokens";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";

const teamBillingDataRepositoryFactoryModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY;
teamBillingDataRepositoryFactoryModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const isTeamBillingEnabled = resolve(DI_TOKENS.IS_TEAM_BILLING_ENABLED);

  if (!isTeamBillingEnabled) {
    return new StubTeamBillingDataRepository();
  }

  const kyselyRead = resolve(GLOBAL_DI_TOKENS.KYSELY_READ_DB) as KyselyDb;
  const kyselyWrite = resolve(GLOBAL_DI_TOKENS.KYSELY_WRITE_DB) as KyselyDb;
  return new KyselyTeamBillingDataRepository(kyselyRead, kyselyWrite);
});

export const teamBillingDataRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependencies first
    kyselyModuleLoader.loadModule(container);
    isTeamBillingEnabledModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY_MODULE, teamBillingDataRepositoryFactoryModule);
  },
};
