import { createContainer } from "@calcom/features/di/di";

import {
  type AuthAccountRepository,
  moduleLoader as authAccountRepositoryModuleLoader,
} from "./AuthAccountRepository.module";

const authAccountRepositoryContainer = createContainer();

export function getAuthAccountRepository(): AuthAccountRepository {
  authAccountRepositoryModuleLoader.loadModule(authAccountRepositoryContainer);
  return authAccountRepositoryContainer.get<AuthAccountRepository>(authAccountRepositoryModuleLoader.token);
}
