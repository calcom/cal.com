import { createContainer } from "@calcom/features/di/di";

import {
  type AuthCredentialsService,
  moduleLoader as authCredentialsServiceModuleLoader,
} from "./AuthCredentialsService.module";

const authCredentialsServiceContainer = createContainer();

export function getAuthCredentialsService(): AuthCredentialsService {
  authCredentialsServiceModuleLoader.loadModule(authCredentialsServiceContainer);
  return authCredentialsServiceContainer.get<AuthCredentialsService>(
    authCredentialsServiceModuleLoader.token
  );
}
