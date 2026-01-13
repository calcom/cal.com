import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { PrismaUserFeatureRepository } from "../repositories/PrismaUserFeatureRepository";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = FLAGS_DI_TOKENS.PRISMA_USER_FEATURE_REPOSITORY;
const moduleToken = FLAGS_DI_TOKENS.PRISMA_USER_FEATURE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaUserFeatureRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaUserFeatureRepository };
