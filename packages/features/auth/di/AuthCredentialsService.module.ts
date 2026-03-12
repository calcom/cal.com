import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import logger from "@calcom/lib/logger";
import { hashEmail } from "@calcom/lib/server/PiiHasher";
import type { PrismaClient } from "@calcom/prisma";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { verifyPassword } from "../lib/verifyPassword";
import { AuthCredentialsService } from "../services/AuthCredentialsService";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_CREDENTIALS_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_CREDENTIALS_SERVICE_MODULE;

thisModule
  .bind(token)
  .toFactory(
    (resolve: ResolveFunction) => {
      const prisma = resolve(prismaModuleLoader.token) as PrismaClient;
      const userRepository = new UserRepository(prisma);
      const log = logger.getSubLogger({ prefix: ["auth-credentials"] });

      return new AuthCredentialsService({
        userRepository,
        checkRateLimitAndThrowError: async (opts: { identifier: string }) => {
          await checkRateLimitAndThrowError({ identifier: opts.identifier });
        },
        hashEmail,
        verifyPassword,
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

export type { AuthCredentialsService };
