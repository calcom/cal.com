import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

export const membershipRepositoryModule = createModule();
const token = DI_TOKENS.MEMBERSHIP_REPOSITORY;
const moduleToken = DI_TOKENS.MEMBERSHIP_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: membershipRepositoryModule,
  moduleToken,
  token,
  classs: PrismaMembershipRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaMembershipRepository };
