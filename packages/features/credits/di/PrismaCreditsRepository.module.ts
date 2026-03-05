import { PrismaCreditsRepository } from "@calcom/features/credits/repositories/PrismaCreditsRepository";
import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";

export const creditsRepositoryModule = createModule();
const token = DI_TOKENS.CREDITS_REPOSITORY;
const moduleToken = DI_TOKENS.CREDITS_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: creditsRepositoryModule,
  moduleToken,
  token,
  classs: PrismaCreditsRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaCreditsRepository };
