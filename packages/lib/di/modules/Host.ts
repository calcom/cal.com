import { DI_TOKENS } from "@calcom/lib/di/tokens";
import { HostRepository } from "@calcom/lib/server/repository/host";
import { moduleLoader as prismaModuleLoader } from "@calcom/prisma/prisma.module";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const hostRepositoryModule = createModule();
const token = DI_TOKENS.HOST_REPOSITORY;
const moduleToken = DI_TOKENS.HOST_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: hostRepositoryModule,
  moduleToken,
  token,
  classs: HostRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
