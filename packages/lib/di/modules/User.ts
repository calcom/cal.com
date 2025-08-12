import { createModule } from "@evyweb/ioctopus";

import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { UserRepository } from "@calcom/lib/server/repository/user";

export const userRepositoryModule = createModule();
userRepositoryModule.bind(DI_TOKENS.USER_REPOSITORY).toClass(UserRepository, [DI_TOKENS.PRISMA_CLIENT]);
