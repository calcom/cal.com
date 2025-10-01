import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const oooRepositoryModule = createModule();
const token = DI_TOKENS.OOO_REPOSITORY;
const moduleToken = DI_TOKENS.OOO_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: oooRepositoryModule,
  moduleToken,
  token,
  classs: PrismaOOORepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
