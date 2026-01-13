import type { ICachedTeamFeatureRepository } from "../repositories/CachedTeamFeatureRepository";
import { createContainer } from "../../di/di";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "./CachedTeamFeatureRepository.module";

const cachedTeamFeatureRepositoryContainer = createContainer();

export function getCachedTeamFeatureRepository(): ICachedTeamFeatureRepository {
  cachedTeamFeatureRepositoryModuleLoader.loadModule(cachedTeamFeatureRepositoryContainer);
  return cachedTeamFeatureRepositoryContainer.get<ICachedTeamFeatureRepository>(
    cachedTeamFeatureRepositoryModuleLoader.token
  );
}
