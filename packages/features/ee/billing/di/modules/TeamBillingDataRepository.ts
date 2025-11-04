import { type Container, createModule, ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { PrismaTeamBillingDataRepository } from "../../repository/teamBillingData/PrismaTeamBillingRepository";
import { StubTeamBillingDataRepository } from "../../repository/teamBillingData/stubTeamBillingRepository";
import { DI_TOKENS } from "../tokens";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";

const teamBillingDataRepositoryModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY;
teamBillingDataRepositoryModule.bind(token).toFactory((resolve) => {
  const isTeamBillingEnabled = resolve(DI_TOKENS.IS_TEAM_BILLING_ENABLED);
  const prisma = resolve(GLOBAL_DI_TOKENS.PRISMA_CLIENT);

  if (!isTeamBillingEnabled) {
    return new StubTeamBillingDataRepository();
  }
  return new PrismaTeamBillingDataRepository(prisma);
});

export const teamBillingDataRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependencies first
    prismaModuleLoader.loadModule(container);
    isTeamBillingEnabledModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY_MODULE, teamBillingDataRepositoryModule);
  },
};
