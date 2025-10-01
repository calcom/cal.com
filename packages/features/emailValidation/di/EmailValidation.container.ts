import { createContainer } from "@calcom/lib/di/di";
import { DI_TOKENS } from "@calcom/lib/di/tokens";

import type { IEmailValidationService } from "../lib/service/IEmailValidationService.interface";
import { moduleLoader as emailValidationCachingProxyServiceModule } from "./EmailValidationCachingProxy.module";

const container = createContainer();

export function getEmailValidationService(): IEmailValidationService {
  emailValidationCachingProxyServiceModule.loadModule(container);
  return container.get<IEmailValidationService>(DI_TOKENS.EMAIL_VALIDATION_CACHING_PROXY_SERVICE);
}
