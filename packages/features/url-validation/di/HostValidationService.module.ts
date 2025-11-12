import { type Container, createModule } from "@calcom/features/di/di";

import { HostValidationService } from "../lib/service/HostValidationService";
import { URL_VALIDATION_TOKENS } from "./tokens";

const thisModule = createModule();
const token = URL_VALIDATION_TOKENS.HOST_VALIDATION_SERVICE;
const moduleToken = URL_VALIDATION_TOKENS.HOST_VALIDATION_SERVICE_MODULE;

// HostValidationService has no dependencies, so we bind it without depsMap or dep
thisModule.bind(token).toClass(HostValidationService, []);

export const moduleLoader = {
  token,
  loadModule: (container: Container) => {
    container.load(moduleToken, thisModule);
  },
};

export type { HostValidationService };

