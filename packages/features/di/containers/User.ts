import { DI_TOKENS } from "@calcom/features/di/tokens";
import { prismaModule } from "@calcom/features/di/modules/Prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { createContainer } from "../di";
import { userRepositoryModule } from "../modules/User";

const container = createContainer();
container.load(DI_TOKENS.PRISMA_MODULE, prismaModule);
container.load(DI_TOKENS.USER_REPOSITORY_MODULE, userRepositoryModule);

export function getUserRepository(): UserRepository {
  return container.get<UserRepository>(DI_TOKENS.USER_REPOSITORY);
}
