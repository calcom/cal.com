import { type Container, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";

const thisModule = createModule();
const token = DI_TOKENS.TEAM_REPOSITORY;
const moduleToken = DI_TOKENS.TEAM_REPOSITORY_MODULE;

thisModule.bind(token).toClass(TeamRepository, [DI_TOKENS.PRISMA_CLIENT]);

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: (container: Container) => {
    prismaModuleLoader.loadModule(container);
    container.load(moduleToken, thisModule);
  },
};

export type { TeamRepository };
