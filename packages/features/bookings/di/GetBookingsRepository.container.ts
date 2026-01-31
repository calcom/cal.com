import { createContainer } from "@calcom/features/di/di";

import {
  type GetBookingsRepositoryForWeb,
  moduleLoader as getBookingsRepositoryForWebModuleLoader,
} from "./GetBookingsRepository.module";

const getBookingsRepositoryForWebContainer = createContainer();

export function getGetBookingsRepositoryForWeb(): GetBookingsRepositoryForWeb {
  getBookingsRepositoryForWebModuleLoader.loadModule(getBookingsRepositoryForWebContainer);
  return getBookingsRepositoryForWebContainer.get<GetBookingsRepositoryForWeb>(
    getBookingsRepositoryForWebModuleLoader.token
  );
}
