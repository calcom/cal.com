import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { moduleLoader as userRepositoryModuleLoader } from "@calcom/features/di/modules/User";
import { createContainer } from "../di";

const container = createContainer();

export function getUserRepository(): UserRepository {
  userRepositoryModuleLoader.loadModule(container);
  return container.get<UserRepository>(userRepositoryModuleLoader.token);
}
