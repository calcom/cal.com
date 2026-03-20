import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import { buildCredentialCreateData } from "@calcom/features/credentials/services/CredentialDataService";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { AuthOutlookCalendarService } from "../services/AuthOutlookCalendarService";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_OUTLOOK_CALENDAR_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_OUTLOOK_CALENDAR_SERVICE_MODULE;

thisModule.bind(token).toFactory(
  (resolve: ResolveFunction) => {
    const prisma = resolve(prismaModuleLoader.token) as PrismaClient;
    const log = logger.getSubLogger({ prefix: ["auth-outlook-calendar"] });

    return new AuthOutlookCalendarService({
      credentialRepository: CredentialRepository,
      buildCredentialCreateData,
      prisma,
      log,
    });
  },
  "singleton"
);

const loadModule = (container: Container) => {
  prismaModuleLoader.loadModule(container);
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AuthOutlookCalendarService };
