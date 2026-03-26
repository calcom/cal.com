import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";

import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeRepositoryModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_REPOSITORY;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeRepositoryModule,
  moduleToken,
  token,
  classs: PrismaAttributeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaAttributeRepository };
