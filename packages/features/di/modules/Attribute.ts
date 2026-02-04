import { PrismaAttributeRepository } from "@calcom/features/attributes/repositories/PrismaAttributeRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const attributeRepositoryModule = createModule();
const token = DI_TOKENS.ATTRIBUTE_REPOSITORY;
const moduleToken = DI_TOKENS.ATTRIBUTE_REPOSITORY_MODULE;
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
