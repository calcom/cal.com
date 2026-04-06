import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";

import { WhitelistUserWorkflowsAction } from "../../../actions/workflow/whitelist-user-workflows";
import { ADMIN_DI_TOKENS } from "../../tokens";
import { adminUserRepositoryModuleLoader } from "../user/admin-user-repository.module";
import { adminWorkflowRepositoryModuleLoader } from "./admin-workflow-repository.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.workflow.WHITELIST_ACTION;
const moduleToken = ADMIN_DI_TOKENS.workflow.WHITELIST_ACTION_MODULE;

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
