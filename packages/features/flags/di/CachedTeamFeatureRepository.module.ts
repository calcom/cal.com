import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import type { Module } from "@evyweb/ioctopus";
import { CachedTeamFeatureRepository } from "../repositories/CachedTeamFeatureRepository";
import { moduleLoader as prismaTeamFeatureRepositoryModuleLoader } from "./PrismaTeamFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = FLAGS_DI_TOKENS.CACHED_TEAM_FEATURE_REPOSITORY;
const moduleToken: symbol = FLAGS_DI_TOKENS.CACHED_TEAM_FEATURE_REPOSITORY_MODULE;

thisModule.bind(token).toClass(CachedTeamFeatureRepository, [prismaTeamFeatureRepositoryModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@calcom/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaTeamFeatureRepositoryModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedTeamFeatureRepository };
