import type { IUserFeatureRepository } from "@calcom/features/flags/repositories/UserFeatureRepository";
import { moduleLoader as userFeatureRepositoryModuleLoader } from "../../flags/di/UserFeatureRepository.module";
import { createContainer } from "../di";

const userFeatureRepositoryContainer = createContainer();

export function getUserFeatureRepository(): IUserFeatureRepository {
  userFeatureRepositoryModuleLoader.loadModule(userFeatureRepositoryContainer);
  return userFeatureRepositoryContainer.get<IUserFeatureRepository>(userFeatureRepositoryModuleLoader.token);
}
