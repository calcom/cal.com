import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";

import { LockUserAccountAction } from "../../actions/lock-user-account";
import { ADMIN_DI_TOKENS } from "../tokens";
import { adminUserRepositoryModuleLoader } from "./AdminUserRepository.module";
import { userUnblockServiceModuleLoader } from "./UserUnblockService.module";
import { workflowRemovalServiceModuleLoader } from "./WorkflowRemovalService.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.LOCK_USER_ACCOUNT_ACTION;
const moduleToken = ADMIN_DI_TOKENS.LOCK_USER_ACCOUNT_ACTION_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: LockUserAccountAction,
  depsMap: {
    userRepo: adminUserRepositoryModuleLoader,
    userUnblockService: userUnblockServiceModuleLoader,
    workflowRemovalService: workflowRemovalServiceModuleLoader,
    logger: loggerModuleLoader,
  },
});

export const lockUserAccountActionModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
