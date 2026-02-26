import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaOrganizationBillingRepository } from "@calcom/features/ee/billing/repository/billing/PrismaOrganizationBillingRepository";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.ORG_BILLING_REPOSITORY;
const moduleToken = DI_TOKENS.ORG_BILLING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaOrganizationBillingRepository,
  dep: prismaModuleLoader,
});

export const orgBillingRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaOrganizationBillingRepository };
