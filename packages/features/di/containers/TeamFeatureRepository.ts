import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/PrismaTeamFeatureRepository";
import { moduleLoader as cachedTeamFeatureRepositoryModuleLoader } from "../../flags/di/CachedTeamFeatureRepository.module";
import { moduleLoader as prismaTeamFeatureRepositoryModuleLoader } from "../../flags/di/PrismaTeamFeatureRepository.module";
import { createContainer } from "../di";

const teamFeatureRepositoryContainer = createContainer();

export function getTeamFeatureRepository(): ITeamFeatureRepository {
  cachedTeamFeatureRepositoryModuleLoader.loadModule(teamFeatureRepositoryContainer);
  return teamFeatureRepositoryContainer.get<ITeamFeatureRepository>(
    cachedTeamFeatureRepositoryModuleLoader.token
  );
}

const uncachedTeamFeatureRepositoryContainer = createContainer();

export function getUncachedTeamFeatureRepository(): ITeamFeatureRepository {
  prismaTeamFeatureRepositoryModuleLoader.loadModule(uncachedTeamFeatureRepositoryContainer);
  return uncachedTeamFeatureRepositoryContainer.get<ITeamFeatureRepository>(
    prismaTeamFeatureRepositoryModuleLoader.token
  );
}
