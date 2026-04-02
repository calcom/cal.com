import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { OAuthService } from "@calcom/features/oauth/services/OAuthService";
import { moduleLoader as accessCodeRepositoryModuleLoader } from "./AccessCodeRepository.module";
import { moduleLoader as oAuthClientRepositoryModuleLoader } from "./OAuthClientRepository.module";
import { moduleLoader as teamRepositoryModuleLoader } from "./TeamRepository.module";
import { OAUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = OAUTH_DI_TOKENS.OAUTH_SERVICE;
const moduleToken = OAUTH_DI_TOKENS.OAUTH_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: OAuthService,
  depsMap: {
    oAuthClientRepository: oAuthClientRepositoryModuleLoader,
    accessCodeRepository: accessCodeRepositoryModuleLoader,
    teamsRepository: teamRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { OAuthService };
