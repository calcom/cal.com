import { createContainer } from "../di";
import {
  type FeaturesRepository,
  moduleLoader as featuresRepositoryModuleLoader,
} from "../modules/FeaturesRepository";

const featuresRepositoryContainer = createContainer();

export function getFeaturesRepository(): FeaturesRepository {
  featuresRepositoryModuleLoader.loadModule(featuresRepositoryContainer);
  return featuresRepositoryContainer.get<FeaturesRepository>(featuresRepositoryModuleLoader.token);
}
