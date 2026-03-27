import { createContainer } from "@calcom/features/di/di";

import {
  type OAuthClientRepository,
  moduleLoader as oAuthClientRepositoryModuleLoader,
} from "./OAuthClientRepository.module";

const oAuthClientRepositoryContainer = createContainer();

export function getOAuthClientRepository(): OAuthClientRepository {
  oAuthClientRepositoryModuleLoader.loadModule(oAuthClientRepositoryContainer);

  return oAuthClientRepositoryContainer.get<OAuthClientRepository>(oAuthClientRepositoryModuleLoader.token);
}
