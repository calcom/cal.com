import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { AdminWorkflowRepository } from "../../../repositories/admin-workflow-repository";
import { ADMIN_DI_TOKENS } from "../../tokens";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.workflow.REPOSITORY;
const moduleToken = ADMIN_DI_TOKENS.workflow.REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: AdminWorkflowRepository,
  dep: prismaModuleLoader,
});

export const adminWorkflowRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
