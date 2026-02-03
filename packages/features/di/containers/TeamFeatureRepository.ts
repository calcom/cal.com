import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/PrismaTeamFeatureRepository";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "../../flags/di/CachedTeamFeatureRepository.module";
import { createContainer } from "../di";

const teamFeatureRepositoryContainer = createContainer();

export function getTeamFeatureRepository(): ITeamFeatureRepository {
  cachedTeamFeatureRepositoryModuleLoader.loadModule(teamFeatureRepositoryContainer);
  return teamFeatureRepositoryContainer.get<ITeamFeatureRepository>(
    cachedTeamFeatureRepositoryModuleLoader.token
  );
}
