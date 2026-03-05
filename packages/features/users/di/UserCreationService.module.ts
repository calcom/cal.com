import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { UserCreationService } from "@calcom/features/users/services/UserCreationService";

const thisModule = createModule();
const token = DI_TOKENS.USER_CREATION_SERVICE;
const moduleToken = DI_TOKENS.USER_CREATION_SERVICE_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: UserCreationService,
  depsMap: {
    userRepository: userRepositoryModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { UserCreationService };
