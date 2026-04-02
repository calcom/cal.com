import { createContainer } from "@calcom/features/di/di";

import {
  type CustomDomainService,
  moduleLoader as customDomainServiceModuleLoader,
} from "./custom-domain-service.module";

const customDomainServiceContainer = createContainer();

export function getCustomDomainService(): CustomDomainService {
  customDomainServiceModuleLoader.loadModule(customDomainServiceContainer);
  return customDomainServiceContainer.get<CustomDomainService>(customDomainServiceModuleLoader.token);
}
