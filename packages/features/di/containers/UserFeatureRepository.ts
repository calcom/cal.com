import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/PrismaUserFeatureRepository";
import { moduleLoader as cachedUserFeatureRepositoryModuleLoader } from "../../flags/di/CachedUserFeatureRepository.module";
import { createContainer } from "../di";

const userFeatureRepositoryContainer = createContainer();

export function getUserFeatureRepository(): IUserFeatureRepository {
  cachedUserFeatureRepositoryModuleLoader.loadModule(userFeatureRepositoryContainer);
  return userFeatureRepositoryContainer.get<IUserFeatureRepository>(
    cachedUserFeatureRepositoryModuleLoader.token
  );
}
