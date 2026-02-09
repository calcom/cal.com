import { type Container, createModule, ModuleLoader, type ResolveFunction } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS as GLOBAL_DI_TOKENS } from "@calcom/features/di/tokens";
import type { PrismaClient } from "@calcom/prisma";

import { IBillingRepository } from "../../repository/billing/IBillingRepository";
import { PrismaOrganizationBillingRepository } from "../../repository/billing/PrismaOrganizationBillingRepository";
import { PrismaTeamBillingRepository } from "../../repository/billing/PrismaTeamBillingRepository";
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

    const prisma = resolve(GLOBAL_DI_TOKENS.PRISMA_CLIENT) as PrismaClient;

    if (isOrganization) {
      return new PrismaOrganizationBillingRepository(prisma);
    }

    return new PrismaTeamBillingRepository(prisma);
  };
});

export const billingRepositoryFactoryModuleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    // Load dependencies first
    prismaModuleLoader.loadModule(container);
    isTeamBillingEnabledModuleLoader.loadModule(container);

    // Then load this module
    container.load(DI_TOKENS.BILLING_REPOSITORY_FACTORY_MODULE, billingRepositoryFactoryModule);
  },
};
