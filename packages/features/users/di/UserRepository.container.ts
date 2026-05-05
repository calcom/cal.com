import { createContainer } from "@calcom/features/di/di";
import { type UserRepository, moduleLoader as userRepositoryModuleLoader } from "./UserRepository.module";

const userRepositoryContainer = createContainer();

export function getUserRepository(): UserRepository {
  userRepositoryModuleLoader.loadModule(userRepositoryContainer);
  return userRepositoryContainer.get<UserRepository>(userRepositoryModuleLoader.token);
}