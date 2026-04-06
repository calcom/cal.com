import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { AdminUserRepository } from "../../../repositories/admin-user-repository";
import { ADMIN_DI_TOKENS } from "../../tokens";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.user.REPOSITORY;
const moduleToken = ADMIN_DI_TOKENS.user.REPOSITORY_MODULE;

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
