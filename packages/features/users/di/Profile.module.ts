import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";

export const profileRepositoryModule = createModule();
const token = DI_TOKENS.PROFILE_REPOSITORY;
const moduleToken = DI_TOKENS.PROFILE_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: profileRepositoryModule,
  moduleToken,
  token,
  classs: ProfileRepository,
  depsMap: {
    prismaClient: prismaModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
