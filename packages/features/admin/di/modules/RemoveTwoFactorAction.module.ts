import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { RemoveTwoFactorAction } from "../../actions/remove-two-factor";
import { ADMIN_DI_TOKENS } from "../tokens";
import { adminUserRepositoryModuleLoader } from "./AdminUserRepository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.REMOVE_TWO_FACTOR_ACTION;
const moduleToken = ADMIN_DI_TOKENS.REMOVE_TWO_FACTOR_ACTION_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RemoveTwoFactorAction,
  depsMap: {
    userRepo: adminUserRepositoryModuleLoader,
  },
});

export const removeTwoFactorActionModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
