import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { PrismaOOORepository } from "@calcom/features/ooo/repositories/PrismaOOORepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "../di";

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
