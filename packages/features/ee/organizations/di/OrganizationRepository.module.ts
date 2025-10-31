import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { PrismaOrganizationRepository } from "@calcom/features/ee/organizations/lib/repository/PrismaOrganizationRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { ORGANIZATION_DI_TOKENS } from "./tokens";

export const organizationRepositoryModule = createModule();
const token = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY;
const moduleToken = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
    module: organizationRepositoryModule,
    moduleToken,
    token,
    classs: PrismaOrganizationRepository,
    dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
    token,
    loadModule,
};

