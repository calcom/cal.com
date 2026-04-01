import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { AdminUserRepository } from "../../repositories/AdminUserRepository";
import { ADMIN_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.ADMIN_USER_REPOSITORY;
const moduleToken = ADMIN_DI_TOKENS.ADMIN_USER_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AdminUserRepository,
  dep: prismaModuleLoader,
});

export const adminUserRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
