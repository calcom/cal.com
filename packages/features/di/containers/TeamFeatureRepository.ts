import type { ITeamFeatureRepository } from "@calcom/features/flags/repositories/TeamFeatureRepository";
import { moduleLoader as teamFeatureRepositoryModuleLoader } from "../../flags/di/TeamFeatureRepository.module";
import { createContainer } from "../di";

const teamFeatureRepositoryContainer = createContainer();

export function getTeamFeatureRepository(): ITeamFeatureRepository {
  teamFeatureRepositoryModuleLoader.loadModule(teamFeatureRepositoryContainer);
  return teamFeatureRepositoryContainer.get<ITeamFeatureRepository>(teamFeatureRepositoryModuleLoader.token);
}
