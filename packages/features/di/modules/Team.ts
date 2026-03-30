import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { bindModuleToClassOnToken, createModule, type Module, type ModuleLoader } from "../di";

const teamRepositoryModule: Module = createModule();
const token: symbol = DI_TOKENS.TEAM_REPOSITORY;
const moduleToken: symbol = DI_TOKENS.TEAM_REPOSITORY_MODULE;
const loadModule: ModuleLoader["loadModule"] = bindModuleToClassOnToken({
  module: teamRepositoryModule,
  moduleToken,
  token,
  classs: TeamRepository,
  dep: prismaModuleLoader,
});

const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export { moduleLoader, teamRepositoryModule };
