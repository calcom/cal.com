import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { AccessCodeRepository } from "@calcom/features/oauth/repositories/AccessCodeRepository";

import { OAUTH_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = OAUTH_DI_TOKENS.ACCESS_CODE_REPOSITORY;
const moduleToken = OAUTH_DI_TOKENS.ACCESS_CODE_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AccessCodeRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { AccessCodeRepository };
