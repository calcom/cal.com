import { createContainer } from "@calcom/features/di/di";

import { type UrlValidationService, moduleLoader as urlValidationServiceModule } from "./UrlValidationService.module";

const urlValidationServiceContainer = createContainer();

export function getUrlValidationService(): UrlValidationService {
  urlValidationServiceModule.loadModule(urlValidationServiceContainer);

  return urlValidationServiceContainer.get<UrlValidationService>(urlValidationServiceModule.token);
}

