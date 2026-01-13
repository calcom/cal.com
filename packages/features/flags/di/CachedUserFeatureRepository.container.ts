import type { ICachedUserFeatureRepository } from "../repositories/CachedUserFeatureRepository";
import { createContainer } from "../../di/di";
import { moduleLoader as cachedUserFeatureRepositoryModuleLoader } from "./CachedUserFeatureRepository.module";

const cachedUserFeatureRepositoryContainer = createContainer();

export function getCachedUserFeatureRepository(): ICachedUserFeatureRepository {
  cachedUserFeatureRepositoryModuleLoader.loadModule(cachedUserFeatureRepositoryContainer);
  return cachedUserFeatureRepositoryContainer.get<ICachedUserFeatureRepository>(
    cachedUserFeatureRepositoryModuleLoader.token
  );
}
