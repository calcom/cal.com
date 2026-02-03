import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { PrismaIntegrationAttributeSyncRepository } from "../repositories/PrismaIntegrationAttributeSyncRepository";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const integrationAttributeSyncRepositoryModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.INTEGRATION_ATTRIBUTE_SYNC_REPOSITORY;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.INTEGRATION_ATTRIBUTE_SYNC_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: integrationAttributeSyncRepositoryModule,
  moduleToken,
  token,
  classs: PrismaIntegrationAttributeSyncRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { IIntegrationAttributeSyncRepository } from "../repositories/IIntegrationAttributeSyncRepository";
