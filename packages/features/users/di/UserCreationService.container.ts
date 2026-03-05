import { createContainer } from "@calcom/features/di/di";
import {
  type UserCreationService,
  moduleLoader as userCreationServiceModuleLoader,
} from "./UserCreationService.module";

const userCreationServiceContainer = createContainer();

export function getUserCreationService(): UserCreationService {
  userCreationServiceModuleLoader.loadModule(userCreationServiceContainer);
  return userCreationServiceContainer.get<UserCreationService>(userCreationServiceModuleLoader.token);
}
