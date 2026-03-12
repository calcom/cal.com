import { createContainer } from "@calcom/features/di/di";

import {
  type AuthSessionService,
  moduleLoader as authSessionServiceModuleLoader,
} from "./AuthSessionService.module";

const authSessionServiceContainer = createContainer();

export function getAuthSessionService(): AuthSessionService {
  authSessionServiceModuleLoader.loadModule(authSessionServiceContainer);
  return authSessionServiceContainer.get<AuthSessionService>(authSessionServiceModuleLoader.token);
}
