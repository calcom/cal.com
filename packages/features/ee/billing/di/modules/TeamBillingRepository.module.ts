import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaTeamBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaTeamBillingRepository";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.TEAM_BILLING_REPOSITORY;
const moduleToken = DI_TOKENS.TEAM_BILLING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaTeamBillingRepository,
  dep: prismaModuleLoader,
});

export const teamBillingRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaTeamBillingRepository };
