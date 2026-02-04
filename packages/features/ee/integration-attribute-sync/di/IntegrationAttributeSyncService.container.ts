import { createContainer } from "@calcom/features/di/di";

import {
  type IntegrationAttributeSyncService,
  moduleLoader as integrationAttributeSyncServiceModule,
} from "./IntegrationAttributeSyncService.module";

const integrationAttributeSyncServiceContainer = createContainer();

export function getIntegrationAttributeSyncService(): IntegrationAttributeSyncService {
  integrationAttributeSyncServiceModule.loadModule(integrationAttributeSyncServiceContainer);

  return integrationAttributeSyncServiceContainer.get<IntegrationAttributeSyncService>(
    integrationAttributeSyncServiceModule.token
  );
}
