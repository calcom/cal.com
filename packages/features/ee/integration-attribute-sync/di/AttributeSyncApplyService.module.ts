import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as attributeServiceModuleLoader } from "@calcom/features/attributes/di/AttributeService.module";

import { AttributeSyncApplyService } from "../services/AttributeSyncApplyService";
import { moduleLoader as integrationAttributeSyncRepositoryModuleLoader } from "./IntegrationAttributeSyncRepository.module";
import { moduleLoader as attributeSyncRuleServiceModuleLoader } from "./AttributeSyncRuleService.module";
import { moduleLoader as attributeSyncFieldMappingServiceModuleLoader } from "./AttributeSyncFieldMappingService.module";
import { moduleLoader as attributeRepositoryModuleLoader } from "./AttributeRepository.module";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeSyncApplyServiceModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_APPLY_SERVICE;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_APPLY_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeSyncApplyServiceModule,
  moduleToken,
  token,
  classs: AttributeSyncApplyService,
  depsMap: {
    integrationAttributeSyncRepository: integrationAttributeSyncRepositoryModuleLoader,
    attributeSyncRuleService: attributeSyncRuleServiceModuleLoader,
    attributeSyncFieldMappingService: attributeSyncFieldMappingServiceModuleLoader,
    attributeRepository: attributeRepositoryModuleLoader,
    attributeService: attributeServiceModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AttributeSyncApplyService };
