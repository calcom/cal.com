import { createContainer } from "@calcom/features/di/di";

import {
  type OAuthAuthorizationRepository,
  moduleLoader as oAuthAuthorizationRepositoryModuleLoader,
} from "./OAuthAuthorizationRepository.module";

const oAuthAuthorizationRepositoryContainer = createContainer();

export function getOAuthAuthorizationRepository(): OAuthAuthorizationRepository {
  oAuthAuthorizationRepositoryModuleLoader.loadModule(oAuthAuthorizationRepositoryContainer);

  return oAuthAuthorizationRepositoryContainer.get<OAuthAuthorizationRepository>(
    oAuthAuthorizationRepositoryModuleLoader.token
  );
}
