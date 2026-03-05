import { createContainer } from "@calcom/features/di/di";
import {
  type UsernameValidationService,
  moduleLoader as usernameValidationServiceModuleLoader,
} from "./UsernameValidationService.module";

const container = createContainer();

export function getUsernameValidationService(): UsernameValidationService {
  usernameValidationServiceModuleLoader.loadModule(container);
  return container.get<UsernameValidationService>(usernameValidationServiceModuleLoader.token);
}
