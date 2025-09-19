import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

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
