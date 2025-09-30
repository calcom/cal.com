import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

export const profileRepositoryModule = createModule();
const token = DI_TOKENS.PROFILE_REPOSITORY;
const moduleToken = DI_TOKENS.PROFILE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: profileRepositoryModule,
  moduleToken,
  token,
  classs: ProfileRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
