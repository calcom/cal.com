import { DI_TOKENS } from "@calcom/features/di/tokens";
import { KyselyOOORepository } from "@calcom/lib/server/repository/KyselyOOORepository";
import { moduleLoader as kyselyModuleLoader } from "@calcom/features/di/modules/Kysely";

import { createModule, bindModuleToClassOnToken, type ModuleLoader } from "../di";

export const oooRepositoryModule = createModule();
const token = DI_TOKENS.OOO_REPOSITORY;
const moduleToken = DI_TOKENS.OOO_REPOSITORY_MODULE;
const loadModule = bindModuleToClassOnToken({
  module: oooRepositoryModule,
  moduleToken,
  token,
  classs: KyselyOOORepository,
  depsMap: {
    kyselyRead: kyselyModuleLoader,
    kyselyWrite: kyselyModuleLoader,
  },
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};
