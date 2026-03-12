import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { buildCredentialCreateData } from "@calcom/features/credentials/services/CredentialDataService";
import logger from "@calcom/lib/logger";

import { AuthGoogleCalendarService } from "../services/AuthGoogleCalendarService";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_GOOGLE_CALENDAR_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_GOOGLE_CALENDAR_SERVICE_MODULE;

thisModule.bind(token).toFactory(
  () => {
    const log = logger.getSubLogger({ prefix: ["auth-google-calendar"] });

    return new AuthGoogleCalendarService({
      credentialRepository: CredentialRepository,
      buildCredentialCreateData,
      log,
    });
  },
  "singleton"
);

const loadModule = (container: Container) => {
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AuthGoogleCalendarService };
