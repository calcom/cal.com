import { PrismaAttributeToUserRepository } from "@calcom/features/attributes/repositories/PrismaAttributeToUserRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeToUserRepositoryModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_TO_USER_REPOSITORY;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_TO_USER_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeToUserRepositoryModule,
  moduleToken,
  token,
  classs: PrismaAttributeToUserRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaAttributeToUserRepository };
