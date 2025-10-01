import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as redisModuleLoader } from "@calcom/features/redis/di/redisModule";

import { EmailValidationCachingProxy } from "../lib/service/EmailValidationCachingProxy";
import { moduleLoader as emailValidationServiceLoader } from "./EmailValidationService.module";

export const emailValidationModule = createModule();

const token = DI_TOKENS.EMAIL_VALIDATION_CACHING_PROXY_SERVICE;
const moduleToken = DI_TOKENS.EMAIL_VALIDATION_CACHING_PROXY_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: emailValidationModule,
  moduleToken,
  token,
  classs: EmailValidationCachingProxy,
  depsMap: {
    emailValidationService: emailValidationServiceLoader,
    redisService: redisModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
