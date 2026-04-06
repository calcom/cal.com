import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as loggerModuleLoader } from "@calcom/features/di/shared/services/logger.service";

import { LockUserAccountAction } from "../../../actions/user/lock-user-account";
import { ADMIN_DI_TOKENS } from "../../tokens";
import { adminUserRepositoryModuleLoader } from "./admin-user-repository.module";
import { userUnblockServiceModuleLoader } from "./user-unblock-service.module";
import { workflowRemovalServiceModuleLoader } from "../workflow/workflow-removal-service.module";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.user.LOCK_ACCOUNT_ACTION;
const moduleToken = ADMIN_DI_TOKENS.user.LOCK_ACCOUNT_ACTION_MODULE;

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
