import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { moduleLoader as cachedUserFeatureRepositoryModuleLoader } from "../../flags/di/CachedUserFeatureRepository.module";
import { moduleLoader as prismaUserFeatureRepositoryModuleLoader } from "../../flags/di/PrismaUserFeatureRepository.module";
import { createContainer } from "../di";

const userFeatureRepositoryContainer = createContainer();

export function getUserFeatureRepository(): IUserFeatureRepository {
  cachedUserFeatureRepositoryModuleLoader.loadModule(userFeatureRepositoryContainer);
  return userFeatureRepositoryContainer.get<IUserFeatureRepository>(
    cachedUserFeatureRepositoryModuleLoader.token
  );
}

const uncachedUserFeatureRepositoryContainer = createContainer();

export function getUncachedUserFeatureRepository(): IUserFeatureRepository {
  prismaUserFeatureRepositoryModuleLoader.loadModule(uncachedUserFeatureRepositoryContainer);
  return uncachedUserFeatureRepositoryContainer.get<IUserFeatureRepository>(
    prismaUserFeatureRepositoryModuleLoader.token
  );
}
