import { createContainer } from "@calcom/features/di/di";

import {
  type AuthSignInService,
  moduleLoader as authSignInServiceModuleLoader,
} from "./AuthSignInService.module";

const authSignInServiceContainer = createContainer();

export function getAuthSignInService(): AuthSignInService {
  authSignInServiceModuleLoader.loadModule(authSignInServiceContainer);
  return authSignInServiceContainer.get<AuthSignInService>(authSignInServiceModuleLoader.token);
}
