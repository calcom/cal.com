import { createContainer } from "@calcom/features/di/di";

import type { UserLockedEmailTasker } from "@calcom/features/ee/api-keys/service/userLockedEmail/tasker/UserLockedEmailTasker";
import { USER_LOCKED_EMAIL_TASKER_DI_TOKENS } from "./tokens";
import { moduleLoader as userLockedEmailTaskerModule } from "./UserLockedEmailTasker.module";

const container = createContainer();

export function getUserLockedEmailTasker(): UserLockedEmailTasker {
  userLockedEmailTaskerModule.loadModule(container);
  return container.get<UserLockedEmailTasker>(USER_LOCKED_EMAIL_TASKER_DI_TOKENS.USER_LOCKED_EMAIL_TASKER);
}
