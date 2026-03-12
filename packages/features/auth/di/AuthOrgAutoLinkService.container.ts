import { createContainer } from "@calcom/features/di/di";

import {
  type AuthOrgAutoLinkService,
  moduleLoader as authOrgAutoLinkServiceModuleLoader,
} from "./AuthOrgAutoLinkService.module";

const authOrgAutoLinkServiceContainer = createContainer();

export function getAuthOrgAutoLinkService(): AuthOrgAutoLinkService {
  authOrgAutoLinkServiceModuleLoader.loadModule(authOrgAutoLinkServiceContainer);
  return authOrgAutoLinkServiceContainer.get<AuthOrgAutoLinkService>(
    authOrgAutoLinkServiceModuleLoader.token
  );
}
