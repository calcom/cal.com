import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { ORGANIZATION_DI_TOKENS } from "./tokens";

export const organizationRepositoryModule = createModule();
const token = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY;
const moduleToken = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: organizationRepositoryModule,
  moduleToken,
  token,
  classs: OrganizationRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { OrganizationRepository };
