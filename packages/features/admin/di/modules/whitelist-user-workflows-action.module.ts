import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { WhitelistUserWorkflowsAction } from "../../actions/whitelist-user-workflows";
import { ADMIN_DI_TOKENS } from "../tokens";
import { adminUserRepositoryModuleLoader } from "./AdminUserRepository.module";
import { adminWorkflowRepositoryModuleLoader } from "./AdminWorkflowRepository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.WHITELIST_USER_WORKFLOWS_ACTION;
const moduleToken = ADMIN_DI_TOKENS.WHITELIST_USER_WORKFLOWS_ACTION_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WhitelistUserWorkflowsAction,
  depsMap: {
    userRepo: adminUserRepositoryModuleLoader,
    workflowRepo: adminWorkflowRepositoryModuleLoader,
  },
});

export const whitelistUserWorkflowsActionModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
