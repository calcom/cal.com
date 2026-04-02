import { createContainer } from "@calcom/features/di/di";
import {
  type AvailabilityRepository,
  moduleLoader as availabilityRepositoryModuleLoader,
} from "./availability-repository.module";

const availabilityRepositoryContainer = createContainer();

export function getAvailabilityRepository(): AvailabilityRepository {
  availabilityRepositoryModuleLoader.loadModule(availabilityRepositoryContainer);

  return availabilityRepositoryContainer.get<AvailabilityRepository>(
    availabilityRepositoryModuleLoader.token
  );
}
