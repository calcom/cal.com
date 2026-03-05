import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { UsernameValidationService } from "@calcom/features/users/services/UsernameValidationService";
import { USER_DI_TOKENS } from "./tokens";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";

const thisModule = createModule();
const token = USER_DI_TOKENS.USERNAME_VALIDATION_SERVICE;
const moduleToken = USER_DI_TOKENS.USERNAME_VALIDATION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UsernameValidationService,
  dep: userRepositoryModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { UsernameValidationService };
