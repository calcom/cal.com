import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import type { Module } from "@evyweb/ioctopus";
import { CachedExperimentRepository } from "../repositories/CachedExperimentRepository";
import { moduleLoader as prismaExperimentRepositoryModuleLoader } from "./PrismaExperimentRepository.module";
import { EXPERIMENTS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = EXPERIMENTS_DI_TOKENS.CACHED_EXPERIMENT_REPOSITORY;
const moduleToken: symbol = EXPERIMENTS_DI_TOKENS.CACHED_EXPERIMENT_REPOSITORY_MODULE;

thisModule.bind(token).toClass(CachedExperimentRepository, [prismaExperimentRepositoryModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@calcom/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaExperimentRepositoryModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedExperimentRepository };
