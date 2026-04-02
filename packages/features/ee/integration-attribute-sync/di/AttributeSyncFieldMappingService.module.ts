import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";
import { AttributeSyncFieldMappingService } from "../services/AttributeSyncFieldMappingService";
import { moduleLoader as attributeOptionRepositoryModuleLoader } from "./AttributeOptionRepository.module";
import { moduleLoader as attributeRepositoryModuleLoader } from "./AttributeRepository.module";
import { moduleLoader as attributeToUserRepositoryModuleLoader } from "./AttributeToUserRepository.module";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeSyncFieldMappingServiceModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_FIELD_MAPPING_SERVICE;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_FIELD_MAPPING_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeSyncFieldMappingServiceModule,
  moduleToken,
  token,
  classs: AttributeSyncFieldMappingService,
  depsMap: {
    attributeToUserRepository: attributeToUserRepositoryModuleLoader,
    attributeRepository: attributeRepositoryModuleLoader,
    attributeOptionRepository: attributeOptionRepositoryModuleLoader,
    membershipRepository: membershipRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AttributeSyncFieldMappingService };
