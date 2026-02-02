import type { IFeatureRepository } from "@calcom/features/flags/repositories/FeatureRepository";
import { moduleLoader as featureRepositoryModuleLoader } from "../../flags/di/FeatureRepository.module";
import { type Container, createContainer } from "../di";

const featureRepositoryContainer: Container = createContainer();

export function getFeatureRepository(): IFeatureRepository {
  featureRepositoryModuleLoader.loadModule(featureRepositoryContainer);
  return featureRepositoryContainer.get<IFeatureRepository>(featureRepositoryModuleLoader.token);
}
