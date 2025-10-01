import { ModuleLoader, bindModuleToClassOnToken, createModule } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import { EmailValidationService } from "../lib/service/EmailValidationService";
import { moduleLoader as emailValidationProviderServiceLoader } from "./EmailValidationProviderService.module";

export const emailValidationServiceModule = createModule();

const token = DI_TOKENS.EMAIL_VALIDATION_SERVICE;
const moduleToken = DI_TOKENS.EMAIL_VALIDATION_SERVICE_MODULE;

export const emailValidationServiceLoader = bindModuleToClassOnToken({
  module: emailValidationServiceModule,
  moduleToken,
  token,
  classs: EmailValidationService,
  depsMap: {
    emailValidationProvider: emailValidationProviderServiceLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule: emailValidationServiceLoader,
};
