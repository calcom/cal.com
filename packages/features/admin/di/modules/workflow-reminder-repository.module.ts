import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";
import { WorkflowReminderRepository } from "@calcom/features/ee/workflows/repositories/workflow-reminder-repository";

import { ADMIN_DI_TOKENS } from "../tokens";

const thisModule = createModule();
const token = ADMIN_DI_TOKENS.WORKFLOW_REMINDER_REPOSITORY;
const moduleToken = ADMIN_DI_TOKENS.WORKFLOW_REMINDER_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: WorkflowReminderRepository,
  dep: prismaModuleLoader,
});

export const workflowReminderRepositoryModuleLoader: ModuleLoader = {
  token,
  loadModule,
};
