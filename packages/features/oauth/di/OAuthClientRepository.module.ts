import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { OAUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = OAUTH_DI_TOKENS.OAUTH_CLIENT_REPOSITORY;
const moduleToken = OAUTH_DI_TOKENS.OAUTH_CLIENT_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: OAuthClientRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { OAuthClientRepository };
