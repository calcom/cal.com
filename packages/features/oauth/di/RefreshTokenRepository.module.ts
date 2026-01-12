import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { RefreshTokenRepository } from "@calcom/features/oauth/repositories/RefreshTokenRepository";
import type { Module } from "@evyweb/ioctopus";

import { OAUTH_DI_TOKENS } from "./tokens";

const thisModule: Module = createModule();
const token: symbol = OAUTH_DI_TOKENS.REFRESH_TOKEN_REPOSITORY;
const moduleToken: symbol = OAUTH_DI_TOKENS.REFRESH_TOKEN_REPOSITORY_MODULE;

const loadModule: (container: import("@evyweb/ioctopus").Container) => void = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: RefreshTokenRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { RefreshTokenRepository };
