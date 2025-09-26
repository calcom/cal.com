import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

export const membershipRepositoryModule = createModule();
const token = DI_TOKENS.MEMBERSHIP_REPOSITORY;
const moduleToken = DI_TOKENS.MEMBERSHIP_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: membershipRepositoryModule,
  moduleToken,
  token,
  classs: MembershipRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { MembershipRepository };
