import { createContainer } from "@calcom/features/di/di";

import {
  type GetBookingsRepository,
  moduleLoader as getBookingsRepositoryModuleLoader,
} from "./GetBookingsRepository.module";

const getBookingsRepositoryContainer = createContainer();

export function getGetBookingsRepository(): GetBookingsRepository {
  getBookingsRepositoryModuleLoader.loadModule(getBookingsRepositoryContainer);
  return getBookingsRepositoryContainer.get<GetBookingsRepository>(getBookingsRepositoryModuleLoader.token);
}
