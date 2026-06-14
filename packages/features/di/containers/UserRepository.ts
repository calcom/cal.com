import { createContainer } from "@calcom/features/di/di";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

const userRepositoryContainer = createContainer();

export function getUserRepository(): UserRepository {
  userRepositoryModuleLoader.loadModule(userRepositoryContainer);
  return userRepositoryContainer.get<UserRepository>(userRepositoryModuleLoader.token);
}
