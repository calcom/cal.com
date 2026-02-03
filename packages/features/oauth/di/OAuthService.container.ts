import { createContainer } from "@calcom/features/di/di";

import { type OAuthService, moduleLoader as oAuthServiceModuleLoader } from "./OAuthService.module";

const oAuthServiceContainer = createContainer();

export function getOAuthService(): OAuthService {
  oAuthServiceModuleLoader.loadModule(oAuthServiceContainer);

  return oAuthServiceContainer.get<OAuthService>(oAuthServiceModuleLoader.token);
}
