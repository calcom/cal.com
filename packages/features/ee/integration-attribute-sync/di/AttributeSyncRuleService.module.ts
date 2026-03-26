import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as membershipRepositoryModuleLoader } from "@calcom/features/users/di/MembershipRepository.module";

import { AttributeSyncRuleService } from "../services/AttributeSyncRuleService";
import { moduleLoader as attributeToUserRepositoryModuleLoader } from "./AttributeToUserRepository.module";
import { INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS } from "./tokens";

export const attributeSyncRuleServiceModule = createModule();
const token = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_RULE_SERVICE;
const moduleToken = INTEGRATION_ATTRIBUTE_SYNC_DI_TOKENS.ATTRIBUTE_SYNC_RULE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeSyncRuleServiceModule,
  moduleToken,
  token,
  classs: AttributeSyncRuleService,
  depsMap: {
    membershipRepository: membershipRepositoryModuleLoader,
    attributeToUserRepository: attributeToUserRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AttributeSyncRuleService };
