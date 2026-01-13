import type { IFeaturesRepository } from "@calcom/features/flags/features.repository.interface";

import { createContainer } from "../di";
import {
  type CachedFeaturesRepository,
  moduleLoader as cachedFeaturesRepositoryModuleLoader,
} from "../modules/CachedFeaturesRepository";

const cachedFeaturesRepositoryContainer = createContainer();

export function getCachedFeaturesRepository(): IFeaturesRepository {
  cachedFeaturesRepositoryModuleLoader.loadModule(cachedFeaturesRepositoryContainer);
  return cachedFeaturesRepositoryContainer.get<CachedFeaturesRepository>(
    cachedFeaturesRepositoryModuleLoader.token
  );
}
