import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { PrismaTeamFeatureRepository } from "../repositories/PrismaTeamFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.PRISMA_TEAM_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.PRISMA_TEAM_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaTeamFeatureRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaTeamFeatureRepository };
