import { PrismaAttributeOptionRepository } from "@calcom/features/attributes/repositories/PrismaAttributeOptionRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeOptionRepositoryModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_OPTION_REPOSITORY;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_OPTION_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeOptionRepositoryModule,
  moduleToken,
  token,
  classs: PrismaAttributeOptionRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaAttributeOptionRepository };
