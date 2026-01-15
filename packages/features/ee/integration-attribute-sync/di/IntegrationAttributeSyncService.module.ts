import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as credentialRepositoryModuleLoader } from "@calcom/features/di/modules/Credential";
import { IntegrationAttributeSyncService } from "@calcom/features/ee/integration-attribute-sync/services/IntegrationAttributeSyncService";
import { moduleLoader as teamRepositoryModuleLoader } from "@calcom/features/oauth/di/TeamRepository.module";

import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";
import { moduleLoader as integrationAttributeSyncRepositoryModuleLoader } from "./IntegrationAttributeSyncRepository.module";

export const integrationAttributeSyncServiceModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.INTEGRATION_ATTRIBUTE_SYNC_SERVICE;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.INTEGRATION_ATTRIBUTE_SYNC_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: integrationAttributeSyncServiceModule,
  moduleToken,
  token,
  classs: IntegrationAttributeSyncService,
  depsMap: {
    credentialRepository: credentialRepositoryModuleLoader,
    integrationAttributeSyncRepository: integrationAttributeSyncRepositoryModuleLoader,
    teamRepository: teamRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { IntegrationAttributeSyncService };
