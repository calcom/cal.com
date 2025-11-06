import { type Container, createModule, ModuleLoader, type ResolveFunction } from "@calcom/features/di/di";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import type { PrismaClient } from "@calcom/prisma";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { PrismaTeamBillingDataRepository } from "../../repository/teamBillingData/PrismaTeamBillingRepository";
import { StubTeamBillingDataRepository } from "../../repository/teamBillingData/stubTeamBillingRepository";
import { DI_TOKENS } from "../tokens";
import { isTeamBillingEnabledModuleLoader } from "./IsTeamBillingEnabled";

const teamBillingDataRepositoryFactoryModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY;
teamBillingDataRepositoryFactoryModule.bind(token).toFactory((resolve: ResolveFunction) => {
  const isTeamBillingEnabled = resolve(DI_TOKENS.IS_TEAM_BILLING_ENABLED);
  const prisma = resolve(GLOBAL_DI_TOKENS.PRISMA_CLIENT) as PrismaClient;

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
    container.load(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY_MODULE, teamBillingDataRepositoryFactoryModule);
  },
};
