import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";

import type { IEmailValidationService } from "../lib/service/IEmailValidationService.interface";
import { moduleLoader as emailValidationServiceModule } from "./EmailValidationService.module";

const container = createContainer();

export function getEmailValidationService(): IEmailValidationService {
  emailValidationServiceModule.loadModule(container);
  return container.get<IEmailValidationService>(DI_TOKENS.EMAIL_VALIDATION_SERVICE);
}
