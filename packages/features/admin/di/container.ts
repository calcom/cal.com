import { createContainer } from "@calcom/features/di/di";

import type { LockUserAccountAction } from "../actions/lock-user-account";
import { ADMIN_DI_TOKENS } from "./tokens";
import { lockUserAccountActionModuleLoader } from "./modules/LockUserAccountAction.module";

const container = createContainer();

export function getLockUserAccountAction(): LockUserAccountAction {
  lockUserAccountActionModuleLoader.loadModule(container);
  return container.get<LockUserAccountAction>(ADMIN_DI_TOKENS.LOCK_USER_ACCOUNT_ACTION);
}
