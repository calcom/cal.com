import { ModuleLoader, bindModuleToClassOnToken, createModule } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import { ZeroBounceEmailValidationProviderService } from "../lib/service/ZeroBounceEmailValidationProviderService";

export const emailValidationProviderServiceModule = createModule();

const token = DI_TOKENS.EMAIL_VALIDATION_PROVIDER_SERVICE;
const moduleToken = DI_TOKENS.EMAIL_VALIDATION_PROVIDER_SERVICE_MODULE;

export const emailValidationProviderServiceLoader = bindModuleToClassOnToken({
  module: emailValidationProviderServiceModule,
  moduleToken,
  token,
  classs: ZeroBounceEmailValidationProviderService,
  depsMap: {},
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: emailValidationProviderServiceLoader,
};
