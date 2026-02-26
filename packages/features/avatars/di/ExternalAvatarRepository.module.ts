import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { ExternalAvatarRepository } from "../repository/ExternalAvatarRepository";

const thisModule = createModule();
const token = DI_TOKENS.EXTERNAL_AVATAR_REPOSITORY;
const moduleToken = DI_TOKENS.EXTERNAL_AVATAR_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: ExternalAvatarRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { ExternalAvatarRepository };
