import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { CustomDomainService } from "../services/custom-domain-service";
import { moduleLoader as customDomainRepositoryModuleLoader } from "./custom-domain-repository.module";
import { CUSTOM_DOMAIN_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = CUSTOM_DOMAIN_DI_TOKENS.CUSTOM_DOMAIN_SERVICE;
const moduleToken = CUSTOM_DOMAIN_DI_TOKENS.CUSTOM_DOMAIN_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: CustomDomainService,
  depsMap: {
    customDomainRepository: customDomainRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { CustomDomainService };
