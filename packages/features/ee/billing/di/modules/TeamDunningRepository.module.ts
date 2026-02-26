import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { TeamDunningRepository } from "@calcom/features/ee/billing/repository/dunning/TeamDunningRepository";
import { DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = DI_TOKENS.TEAM_DUNNING_REPOSITORY;
const moduleToken = DI_TOKENS.TEAM_DUNNING_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: TeamDunningRepository,
  dep: prismaModuleLoader,
});

export const teamDunningRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { TeamDunningRepository };
