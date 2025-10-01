import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import type { IEmailValidationCachingProxy } from "../lib/service/IEmailValidationService.interface";
import { moduleLoader as emailValidationCachingProxyServiceModule } from "./EmailValidationCachingProxy.module";

const container = createContainer();

export function getEmailValidationService(): IEmailValidationCachingProxy {
  emailValidationCachingProxyServiceModule.loadModule(container);
  return container.get<IEmailValidationCachingProxy>(DI_TOKENS.EMAIL_VALIDATION_CACHING_PROXY_SERVICE);
}
