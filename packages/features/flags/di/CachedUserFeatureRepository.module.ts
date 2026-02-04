import { createModule, type ModuleLoader } from "@calcom/features/di/di";
import type { Module } from "@evyweb/ioctopus";
import { CachedUserFeatureRepository } from "../repositories/CachedUserFeatureRepository";
import { moduleLoader as prismaUserFeatureRepositoryModuleLoader } from "./PrismaUserFeatureRepository.module";
import { FLAGS_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = FLAGS_DI_TOKENS.CACHED_USER_FEATURE_REPOSITORY;
const moduleToken: symbol = FLAGS_DI_TOKENS.CACHED_USER_FEATURE_REPOSITORY_MODULE;

thisModule.bind(token).toClass(CachedUserFeatureRepository, [prismaUserFeatureRepositoryModuleLoader.token]);

const loadModule = (container: ReturnType<typeof import("@calcom/features/di/di").createContainer>): void => {
  container.load(moduleToken, thisModule);
  prismaUserFeatureRepositoryModuleLoader.loadModule(container);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CachedUserFeatureRepository };
