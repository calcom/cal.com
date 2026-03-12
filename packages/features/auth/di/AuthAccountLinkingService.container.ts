import { createContainer } from "@calcom/features/di/di";

import {
  type AuthAccountLinkingService,
  moduleLoader as authAccountLinkingServiceModuleLoader,
} from "./AuthAccountLinkingService.module";

const authAccountLinkingServiceContainer = createContainer();

export function getAuthAccountLinkingService(): AuthAccountLinkingService {
  authAccountLinkingServiceModuleLoader.loadModule(authAccountLinkingServiceContainer);
  return authAccountLinkingServiceContainer.get<AuthAccountLinkingService>(
    authAccountLinkingServiceModuleLoader.token
  );
}
