import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { AttributeService } from "../services/AttributeService";
import { moduleLoader as attributeToUserRepositoryModuleLoader } from "./AttributeToUserRepository.module";
import { ATTRIBUTE_DI_TOKENS } from "./tokens";

export const attributeServiceModule = createModule();
const token = ATTRIBUTE_DI_TOKENS.ATTRIBUTE_SERVICE;
const moduleToken = ATTRIBUTE_DI_TOKENS.ATTRIBUTE_SERVICE_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: attributeServiceModule,
  moduleToken,
  token,
  classs: AttributeService,
  depsMap: {
    attributeToUserRepository: attributeToUserRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AttributeService };
