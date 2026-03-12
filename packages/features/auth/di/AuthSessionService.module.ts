import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { LicenseKeySingleton } from "@calcom/ee/common/server/LicenseKeyService";
import { DeploymentRepository } from "@calcom/features/ee/deployment/repositories/DeploymentRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { AuthSessionService } from "../services/AuthSessionService";
import type { AuthGoogleCalendarService } from "../services/AuthGoogleCalendarService";
import { moduleLoader as googleCalendarModuleLoader } from "./AuthGoogleCalendarService.module";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_SESSION_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_SESSION_SERVICE_MODULE;

thisModule
  .bind(token)
  .toFactory(
    (resolve: ResolveFunction) => {
      const prisma = resolve(prismaModuleLoader.token) as PrismaClient;
      const googleCalendarService = resolve(
        googleCalendarModuleLoader.token
      ) as AuthGoogleCalendarService;

      const log = logger.getSubLogger({ prefix: ["AuthSessionService"] });
      const deploymentRepo = new DeploymentRepository(prisma);

      // LicenseKeySingleton.getInstance() is async; wrap as a lazy proxy
      // so the factory stays synchronous. The singleton caches after first call.
      const licenseKeyService = {
        checkLicense: async () => {
          const instance = await LicenseKeySingleton.getInstance(deploymentRepo);
          return instance.checkLicense();
        },
      };

      return new AuthSessionService({
        googleCalendarService,
        prisma,
        profileRepository: {
          findAllProfilesForUserIncludingMovedUser:
            ProfileRepository.findAllProfilesForUserIncludingMovedUser.bind(ProfileRepository),
          findByUpIdWithAuth: ProfileRepository.findByUpIdWithAuth.bind(ProfileRepository),
        },
        licenseKeyService,
        log,
      });
    },
    "singleton"
  );

const loadModule = (container: Container) => {
  prismaModuleLoader.loadModule(container);
  googleCalendarModuleLoader.loadModule(container);
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AuthSessionService };
