import { type Container, type ModuleLoader, createModule } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import type { PrismaClient } from "@calcom/prisma";
import type { ResolveFunction } from "@evyweb/ioctopus";

import { AuthOrgAutoLinkService } from "../services/AuthOrgAutoLinkService";
import { AUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = AUTH_DI_TOKENS.AUTH_ORG_AUTO_LINK_SERVICE;
const moduleToken = AUTH_DI_TOKENS.AUTH_ORG_AUTO_LINK_SERVICE_MODULE;

const ORGANIZATIONS_AUTOLINK =
  process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

thisModule
  .bind(token)
  .toFactory(
    (resolve: ResolveFunction) => {
      const prisma = resolve(prismaModuleLoader.token) as PrismaClient;
      return new AuthOrgAutoLinkService(prisma, ORGANIZATIONS_AUTOLINK);
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

export type { AuthOrgAutoLinkService };
