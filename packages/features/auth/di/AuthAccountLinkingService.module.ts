import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { hostedCal } from "@calcom/features/ee/sso/lib/saml";
import logger from "@calcom/lib/logger";
import type { PrismaClient } from "@calcom/prisma";
import type { ResolveFunction } from "@evyweb/ioctopus";

import CalComAdapter from "../lib/next-auth-custom-adapter";
import { validateSamlAccountConversion } from "../lib/samlAccountLinking";
import signJwt from "../lib/signJwt";
import type { AuthAccountRepository } from "../repositories/AuthAccountRepository";
import { AuthAccountLinkingService } from "../services/AuthAccountLinkingService";
import type { AuthOrgAutoLinkService } from "../services/AuthOrgAutoLinkService";
import { moduleLoader as authAccountRepoModuleLoader } from "./AuthAccountRepository.module";
import { moduleLoader as orgAutoLinkModuleLoader } from "./AuthOrgAutoLinkService.module";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_ACCOUNT_LINKING_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_ACCOUNT_LINKING_SERVICE_MODULE;

thisModule
  .bind(token)
  .toFactory(
    (resolve: ResolveFunction) => {
      const authAccountRepo = resolve(authAccountRepoModuleLoader.token) as AuthAccountRepository;
      const orgAutoLinkService = resolve(orgAutoLinkModuleLoader.token) as AuthOrgAutoLinkService;
      const prisma = resolve(prismaModuleLoader.token) as PrismaClient;

      const log = logger.getSubLogger({ prefix: ["AuthAccountLinkingService"] });
      const calcomAdapter = CalComAdapter(prisma);

      const loginWithTotp = async (email: string) =>
        `/auth/login?totp=${encodeURIComponent(await signJwt({ email }))}`;

      return new AuthAccountLinkingService({
        authAccountRepo,
        orgAutoLinkService,
        validateSamlAccountConversion,
        calcomAdapter: calcomAdapter as { linkAccount: (data: Record<string, unknown>) => Promise<void> },
        loginWithTotp,
        hostedCal,
        log,
        prisma,
      });
    },
    "singleton"
  );

const loadModule = (container: Container) => {
  prismaModuleLoader.loadModule(container);
  authAccountRepoModuleLoader.loadModule(container);
  orgAutoLinkModuleLoader.loadModule(container);
  container.load(moduleToken, thisModule);
};

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AuthAccountLinkingService };
